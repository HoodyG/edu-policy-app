const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

const normalizeText = (value = '') => value.toLowerCase().replace(/\s+/g, '');

const truncateText = (value = '', maxLength = 220) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
};

const buildNewsSummary = (news, { includeDetail = false } = {}) => {
  if (!news) {
    return '';
  }

  const summarySource = includeDetail
    ? String(news.detailContent || news.summary || news.content || '')
    : String(news.summary || news.content || news.detailContent || '');

  return [
    `标题：${news.title}`,
    `日期：${news.date}`,
    `来源：${news.source || '未知来源'}`,
    news.category ? `分类：${news.category}` : '',
    `摘要：${truncateText(summarySource, includeDetail ? 320 : 160)}`
  ].filter(Boolean).join('\n');
};

const buildNewsDigest = (newsList = [], currentNews = null) => {
  const digestItems = [];
  const seenIds = new Set();

  if (currentNews) {
    digestItems.push(`当前卡片：\n${buildNewsSummary(currentNews, { includeDetail: true })}`);
    if (currentNews.id !== undefined && currentNews.id !== null) {
      seenIds.add(currentNews.id);
    }
  }

  newsList
    .filter((news) => !seenIds.has(news.id))
    .slice(0, currentNews ? 8 : 12)
    .forEach((news, index) => {
      digestItems.push(`相关卡片 ${index + 1}：\n${buildNewsSummary(news)}`);
    });

  return digestItems.join('\n\n');
};

export const hasDoubaoConfig = () => {
  return Boolean(import.meta.env.VITE_DOUBAO_API_KEY && import.meta.env.VITE_DOUBAO_MODEL);
};

export const buildLocalAnswer = ({ query, newsList = [], currentNews = null }) => {
  const keywords = normalizeText(query)
    .split(/[，。,；：、？！\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (currentNews) {
    const currentHaystack = normalizeText(`${currentNews.title} ${currentNews.summary} ${currentNews.content} ${currentNews.detailContent} ${currentNews.category} ${currentNews.source}`);
    const currentScore = keywords.reduce((total, keyword) => total + (currentHaystack.includes(keyword) ? 1 : 0), 0);

    if (currentScore > 0 || keywords.length === 0) {
      return [
        '当前还没有配置豆包接口，我先基于当前卡片内容给你一个近似回答：',
        '',
        `${currentNews.title}（${currentNews.date}，${currentNews.source}）`,
        truncateText(currentNews.detailContent || currentNews.summary || currentNews.content || '', 260),
        '',
        '如果你想让 AI 做更准确的追问总结，下一步建议配置豆包接口。'
      ].join('\n');
    }
  }

  const ranked = newsList
    .map((news) => {
      const haystack = normalizeText(`${news.title} ${news.summary} ${news.content} ${news.detailContent} ${news.category} ${news.source}`);
      const score = keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
      return { news, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.news.date) - new Date(a.news.date))
    .slice(0, 3);

  if (ranked.length === 0) {
    return '当前还没有配置豆包接口，所以暂时不能做真正的联网问答。我可以先基于页面里的新闻内容回答；如果你要接豆包，请在 `.env.local` 里配置 `VITE_DOUBAO_API_KEY` 和 `VITE_DOUBAO_MODEL`。';
  }

  return [
    '当前还没有配置豆包接口，我先根据站内新闻给你一个近似回答：',
    '',
    ...ranked.map(({ news }, index) => `${index + 1}. ${news.title}（${news.date}，${news.source}）`),
    '',
    '配置好豆包接口后，这里会直接调用模型回答，而不是使用站内兜底摘要。'
  ].join('\n');
};

export const askDoubao = async ({ query, history = [], newsList = [], currentNews = null }) => {
  const apiKey = import.meta.env.VITE_DOUBAO_API_KEY;
  const model = import.meta.env.VITE_DOUBAO_MODEL;
  const baseUrl = (import.meta.env.VITE_DOUBAO_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');

  if (!apiKey || !model) {
    const error = new Error('Missing Doubao configuration');
    error.code = 'MISSING_DOUBAO_CONFIG';
    throw error;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: [
            '你是教育政策问答助手。',
            '优先围绕当前卡片正文回答；如果当前卡片信息不足，再参考给定的相关卡片。',
            '如果问题需要站外最新信息，而当前上下文不足，请明确说明需要联网搜索能力，不要编造已搜索到的事实。',
            '回答使用简体中文，结构简洁，优先给结论再给依据。'
          ].join('')
        },
        {
          role: 'system',
          content: `站内新闻上下文：\n${buildNewsDigest(newsList, currentNews)}`
        },
        ...history,
        {
          role: 'user',
          content: query
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(errorText || 'Doubao request failed');
    error.code = 'DOUBAO_REQUEST_FAILED';
    throw error;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || '豆包已返回结果，但没有解析到正文。';
};
