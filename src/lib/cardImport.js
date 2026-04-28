const JINA_PREFIX = 'https://r.jina.ai/http://';

const NOISE_PATTERNS = [
  /^(登录|注册|收藏|分享|扫一扫分享本页)$/,
  /^当前位置/,
  /^(网站声明|网站地图|联系我们|版权所有)/,
  /京ICP备|京公网安备|网站标识码/,
  /按回车键在新窗口打开无障碍说明页面/,
  /(Languages|English|Русский|日本語|Deutsch|Français|Español|العربية|微言教育|无障碍浏览)/,
  /^责任编辑/,
  /^来源[:：]\s*$/,
  /^来源：.+$/,
  /^\d{4}\s+\d{1,2}\s+\d{1,2}\s+来源[:：]/,
  /^扫描分享/,
  /^扫一扫分享本页/,
  /^微信扫一扫/,
  /分享 微信里点[“"]发现[”"]?/,
  /^首\s*页$/,
  /^首页$/,
  /^新闻$/,
  /^教育部$/,
  /政府门户网站$/,
  /^相关阅读/,
  /^相关链接/,
  /^延伸阅读/,
  /^本站注明稿件来源/,
  /^②/,
  /^当前浏览器版本过低/
];

const normalizeUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
};

const stripMarkdownNoise = (value = '') => String(value || '')
  .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
  .replace(/^>\s*/gm, '')
  .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
  .replace(/[*#>`_-]+/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim();

const trimSentenceEnding = (value = '') => String(value || '').trim().replace(/[。！？；]+$/g, '');
const normalizeComparable = (value = '') => String(value || '').replace(/\s+/g, '').trim();
const normalizeComparableLoose = (value = '') => normalizeComparable(value).replace(/[。！？；，、“”"'…\.]/g, '');
const normalizeTopicText = (value = '') => normalizeComparableLoose(value).toLowerCase();

const TOPIC_STOP_WORDS = [
  '教育',
  '教育部',
  '人力资源社会保障部',
  '人力资源社会保障',
  '中国教育信息网',
  '要闻',
  '记者问',
  '通知',
  '会议',
  '工作',
  '部署',
  '要求',
  '指出',
  '强调',
  '近日',
  '日前',
  '有关',
  '相关',
  '本次',
  '此次',
  '推动',
  '做好',
  '关于',
  '召开'
];

const truncateText = (value = '', maxLength = 118) => {
  const normalized = String(value || '').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
};

const looksLikeNoise = (line = '') => {
  const trimmed = String(line || '').trim();
  if (!trimmed) {
    return true;
  }

  if (trimmed.length <= 1) {
    return true;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
};

const stripRepeatedLead = (value = '') => {
  const text = String(value || '').trim();
  if (text.length < 40) {
    return text;
  }

  for (let length = 12; length <= 36; length += 4) {
    const prefix = text.slice(0, length);
    const repeatedIndex = text.indexOf(prefix, length + 8);
    if (repeatedIndex >= 24) {
      return text.slice(0, repeatedIndex).trim();
    }
  }

  return text;
};

const getLeadComparable = (value = '', length = 26) => normalizeComparableLoose(String(value || '').slice(0, length));

const sanitizeTitleCandidate = (value = '') => {
  const cleaned = stripRepeatedLead(
    stripMarkdownNoise(value)
      .replace(/\s*(?:[-|_｜]\s*)?(中华人民共和国教育部.*|.*政府门户网站)$/u, '')
      .replace(/\s*(?:[-|_｜]\s*)?(要闻\s*中国教育信息网.*|中国教育信息网.*|做有温度的教育资讯报道.*)$/u, '')
      .replace(/^(图解[!！：:\s]*)+/, '')
      .replace(/^(教育时评[!！：:\s]*)+/, '')
      .replace(/[ \t]+/g, ' ')
      .trim()
  );

  const collapsed = cleaned
    .replace(/(.{6,24}?)\1{1,}/g, '$1')
    .replace(/(202\d年[^。！？]{4,24}?)(?:\1)+/g, '$1')
    .trim();

  return collapsed.slice(0, 48);
};

const extractDate = (value = '') => {
  const match = String(value || '').match(/(20\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})日?/);
  if (!match) {
    return '';
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const isHardStopLine = (line = '') => {
  const text = stripMarkdownNoise(line);
  if (!text) {
    return false;
  }

  return (
    /^(原标题[:：]|Notice:|Copyright ©|本站部分信息由作者上传并发布|相关阅读|相关链接|延伸阅读|责任编辑)/.test(text) ||
    /热\s*度/.test(text) ||
    /All Rights Reserved|Build with ♥|浏览器版本过低|转载稿|非商业性/.test(text) ||
    /^教育专题\s*\|/.test(text) ||
    /^中国青少年研究中心发布/.test(text) ||
    /^为方便行业人士或投资者/.test(text) ||
    /^数据显示，全国共有各级各类学校/.test(text) ||
    /^女教师被丈夫举报/.test(text) ||
    /^【校园恶性霸凌事件频发】/.test(text) ||
    /^教育部发布温馨提示：/.test(text) ||
    /^\d+\s+2023爱普生创新大会开启/.test(text) ||
    /^今年以来，多位院士卸任高校领导/.test(text) ||
    /^扬体育精神 展卓越风采/.test(text) ||
    /^2026年度IBBY iRead爱阅人物奖/.test(text) ||
    /^以中华优秀传统文化滋养中国特色社会主义文化/.test(text)
  );
};

const isLikelyArticleContentLine = (line = '') => {
  const text = stripMarkdownNoise(line);
  if (!text || looksLikeNoise(text)) {
    return false;
  }

  if (isHardStopLine(text)) {
    return false;
  }

  return (
    (text.length >= 28 && /[。！？]/.test(text)) ||
    /^(教育部等|近日，|近年来，|下一步，|各地要|基础教育阶段|高等教育阶段|终身教育阶段|同时，|中央财政|孤独症儿童|教育部科学技术与信息化司)/.test(text)
  );
};

const extractStructuredBodyLines = (lines = [], url = '') => {
  if (!lines.length) {
    return lines;
  }

  let startIndex = lines.findIndex((line) => isLikelyArticleContentLine(line));
  if (startIndex < 0) {
    return lines;
  }

  const selected = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const text = stripMarkdownNoise(rawLine);

    if (!text) {
      selected.push(rawLine);
      continue;
    }

    if (isHardStopLine(text)) {
      break;
    }

    if (looksLikeNoise(text)) {
      if (selected.length > 0) {
        selected.push('');
      }
      continue;
    }

    selected.push(rawLine);
  }

  return selected.length ? selected : lines;
};

const groupLinesToParagraphs = (lines = []) => {
  const paragraphs = [];
  let current = [];

  const pushCurrent = () => {
    if (current.length === 0) {
      return;
    }

    const paragraph = current
      .map((line) => stripMarkdownNoise(line))
      .join('')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (paragraph && !looksLikeNoise(paragraph)) {
      paragraphs.push(paragraph);
    }

    current = [];
  };

  lines.forEach((line) => {
    const trimmed = String(line || '').trim();
    if (!trimmed) {
      pushCurrent();
      return;
    }

    if (looksLikeNoise(trimmed)) {
      pushCurrent();
      return;
    }

    current.push(trimmed);
  });

  pushCurrent();

  return paragraphs
    .filter((paragraph, index, array) => paragraph.length >= 16 || index === 0)
    .filter((paragraph, index, array) => array.indexOf(paragraph) === index);
};

const cleanImportedParagraph = (value = '') => {
  const normalized = stripRepeatedLead(stripMarkdownNoise(value)
    .replace(/(\.{3,}|…{2,})详细$/g, '')
    .replace(/当前浏览器版本过低.*$/, '')
    .replace(/[ \t]+/g, ' ')
    .trim());

  const sentenceList = normalized
    .split(/(?<=[。！？…])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentenceList.length === 0) {
    return normalized;
  }

  const dedupedSentences = [];
  const seen = new Set();
  sentenceList.forEach((sentence) => {
    const comparable = normalizeComparable(sentence);
    if (!comparable || seen.has(comparable)) {
      return;
    }

    seen.add(comparable);
    dedupedSentences.push(sentence);
  });

  return dedupedSentences.join('').trim();
};

const dedupeParagraphs = (paragraphs = []) => {
  const seen = new Set();

  return paragraphs.filter((paragraph) => {
    const comparable = normalizeComparable(paragraph);
    if (!comparable || seen.has(comparable)) {
      return false;
    }

    seen.add(comparable);
    return true;
  });
};

const isTruncatedSnippetParagraph = (paragraph = '') => {
  const text = String(paragraph || '').trim();
  if (!text) {
    return false;
  }

  return (
    /(\.{3,}|…)$/.test(text) ||
    /(\.{3,}|…)([^。！？]*)$/.test(text) ||
    (/\.{3,}/.test(text) && !/[。！？]$/.test(text))
  );
};

const isHeadlineLikeParagraph = (paragraph = '') => {
  const text = String(paragraph || '').trim();
  if (!text) {
    return false;
  }

  return (
    text.length >= 12 &&
    text.length <= 60 &&
    !/[。！？]/.test(text) &&
    /(——|专题|研讨会|成功|新篇|会议|发展|建设|学术|探索|铺开|之势)/.test(text)
  );
};

const extractTopicKeywords = (title = '', paragraphs = []) => {
  const seedText = [title, paragraphs[0], paragraphs[1]]
    .filter(Boolean)
    .join(' ');

  const candidates = String(seedText || '')
    .match(/[\u4e00-\u9fa5A-Za-z0-9]+/g) || [];

  const seen = new Set();
  return candidates
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 14)
    .filter((item) => !TOPIC_STOP_WORDS.includes(item))
    .filter((item) => !/^(202\d|20\d{2}年|\d+月\d+日|\d+日)$/.test(item))
    .filter((item) => !/^(各地|各省|自治区|直辖市|兵团|负责同志)$/.test(item))
    .filter((item) => {
      const normalized = normalizeTopicText(item);
      if (!normalized || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
};

const getTopicHitCount = (paragraph = '', keywords = []) => {
  const normalized = normalizeTopicText(paragraph);
  if (!normalized) {
    return 0;
  }

  return keywords.reduce((count, keyword) => {
    const normalizedKeyword = normalizeTopicText(keyword);
    if (!normalizedKeyword || normalizedKeyword.length < 2) {
      return count;
    }

    return normalized.includes(normalizedKeyword) ? count + 1 : count;
  }, 0);
};

const isStrongArticleParagraph = (paragraph = '') => {
  const text = String(paragraph || '').trim();
  if (!text) {
    return false;
  }

  return (
    text.length >= 48 ||
    /(会议指出|会议强调|通知明确|通知要求|各地要|要严格|要进一步|要切实|要加强|严禁|不得|鼓励|支持|保障)/.test(text)
  );
};

const filterTopicRelevantParagraphs = (title = '', paragraphs = []) => {
  if (paragraphs.length <= 2) {
    return paragraphs;
  }

  const keywords = extractTopicKeywords(title, paragraphs);
  if (keywords.length === 0) {
    return paragraphs;
  }

  const kept = [];
  let startedMainBody = false;

  paragraphs.forEach((paragraph, index) => {
    if (index < 2) {
      kept.push(paragraph);
      startedMainBody = true;
      return;
    }

    const hitCount = getTopicHitCount(paragraph, keywords);
    const relevantByContext = kept.some((item) => {
      const normalizedCurrent = normalizeTopicText(paragraph);
      const normalizedPrevious = normalizeTopicText(item);
      return (
        normalizedCurrent &&
        normalizedPrevious &&
        (
          normalizedCurrent.includes(normalizedPrevious.slice(0, 18)) ||
          normalizedPrevious.includes(normalizedCurrent.slice(0, 18))
        )
      );
    });

    if (hitCount >= 1 || relevantByContext || isStrongArticleParagraph(paragraph)) {
      kept.push(paragraph);
      startedMainBody = true;
      return;
    }

    if (startedMainBody) {
      return;
    }
  });

  return kept.length >= 2 ? kept : paragraphs;
};

const isNavigationParagraph = (paragraph = '') => {
  const text = String(paragraph || '').trim();
  if (!text) {
    return false;
  }

  if (/[。！？]/.test(text)) {
    return false;
  }

  const keywordHits = (text.match(/(服务|要闻|动态|政策|法规|教育|高校|职教|继续教育|国际教育|留学|思政|教学|招考|就业|高教|基础教育)/g) || []).length;
  return keywordHits >= 5;
};

const isEndingNoiseParagraph = (paragraph = '') => {
  const text = String(paragraph || '').trim();
  if (!text) {
    return false;
  }

  return (
    looksLikeNoise(text) ||
    isNavigationParagraph(text) ||
    /^(微信扫一扫|分享 微信里点|本站注明稿件来源|相关阅读|相关链接|延伸阅读|责任编辑)/.test(text) ||
    /^(原标题[:：]|Notice:|Copyright ©|本站部分信息由作者上传并发布)/.test(text) ||
    /浏览器版本过低|转载稿|非商业性|二维码便可将本文分享至朋友圈|All Rights Reserved|Build with ♥/.test(text) ||
    /^(北大、清华|徐飞：|图解！|教育时评：|朝着建成教育强国|今日由中国教育电视台)/.test(text)
  );
};

const isAggregateParagraph = (paragraph = '') => {
  const text = String(paragraph || '').trim();
  if (!text) {
    return false;
  }

  return (
    /图解|教育时评|开幕观察|闭幕观察|与会代表畅谈|系列述评|十大教育新闻|浏览器版本过低|详细$/.test(text) ||
    /^·/.test(text) ||
    (/^\d+\s/.test(text) && text.length > 40) ||
    text.length < 10
  );
};

const isLikelyArticleUrl = (value = '') => {
  try {
    const url = new URL(value);
    const pathname = url.pathname || '';

    return (
      /\/t20\d{6,8}_\d+\.s?html?$/i.test(pathname) ||
      /\/20\d{4,8}\/[^/]+\.s?html?$/i.test(pathname)
    );
  } catch {
    return false;
  }
};

const extractPrimaryBodyParagraphs = (paragraphs = [], url = '') => {
  if (!paragraphs.length) {
    return [];
  }

  if (!isLikelyArticleUrl(url)) {
    return paragraphs;
  }

  const result = [];
  let bodyStarted = false;

  for (const paragraph of paragraphs) {
    const text = String(paragraph || '').trim();
    if (!text) {
      continue;
    }

    const longEnough = text.length >= 26;
    const articleLike = /[。！？]$/.test(text) || text.length >= 40;
    const validStart = longEnough && articleLike && !isNavigationParagraph(text) && !isEndingNoiseParagraph(text);

    if (!bodyStarted && validStart) {
      bodyStarted = true;
    }

    if (!bodyStarted) {
      continue;
    }

    if (
      result.length >= 1 &&
      (
        isEndingNoiseParagraph(text) ||
        isAggregateParagraph(text) ||
        isTruncatedSnippetParagraph(text) ||
        isHeadlineLikeParagraph(text) ||
        /^(相关阅读|延伸阅读|相关报道|相关链接|教育时评|图解|回眸\d{4}|今日由|朝着建成教育强国)/.test(text) ||
        /浏览器版本过低|十大教育新闻|开幕观察|闭幕观察|系列述评/.test(text)
      )
    ) {
      break;
    }

    if (articleLike || result.length === 0) {
      result.push(text);
    }
  }

  return result.length >= 2 ? result : paragraphs;
};

const isLikelyAggregatePage = (title = '', paragraphs = [], url = '') => {
  if (paragraphs.length === 0) {
    return false;
  }

  const aggregateCount = paragraphs.filter((paragraph) => isAggregateParagraph(paragraph)).length;
  const shortCount = paragraphs.filter((paragraph) => paragraph.length <= 28).length;
  const combined = `${title}\n${paragraphs.join('\n')}`;
  const longSentenceParagraphCount = paragraphs.filter((paragraph) => paragraph.length >= 36 && /[。！？]/.test(paragraph)).length;

  if (isLikelyArticleUrl(url)) {
    if (longSentenceParagraphCount >= 2 && aggregateCount <= Math.max(2, paragraphs.length - 2)) {
      return false;
    }
  }

  return (
    aggregateCount >= 3 ||
    shortCount >= 4 ||
    (/专题/.test(title) && paragraphs.length >= 5) ||
    (/图解/.test(title) && longSentenceParagraphCount < 2) ||
    /教育时评|系列述评|十大教育新闻|开幕观察|闭幕观察/.test(combined)
  );
};

const buildSummary = (title = '', paragraphs = []) => {
  const firstParagraph = paragraphs[0] || '';
  const sentences = firstParagraph
    .split(/(?<=[。！？])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length >= 2) {
    return truncateText(`${trimSentenceEnding(sentences[0])}，${trimSentenceEnding(sentences[1])}。`);
  }

  if (firstParagraph) {
    return truncateText(firstParagraph);
  }

  return truncateText(title);
};

const findTitleCandidateFromLines = (rawText = '') => {
  const lines = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => stripMarkdownNoise(line))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return lines.find((line) => (
    line.length >= 8 &&
    line.length <= 42 &&
    !/[。！？]/.test(line) &&
    !/^(当前位置|首页|首\s*页|新闻|来源[:：]|责任编辑|Languages|English|Русский|日本語|Deutsch|Français|Español|العربية)/.test(line) &&
    !/(收藏|扫一扫分享本页|微言教育|无障碍浏览|政府门户网站)$/.test(line) &&
    !/^\d{4}[-年/.]/.test(line)
  )) || '';
};

const extractTitle = (rawText = '', paragraphs = [], fallbackUrl = '') => {
  const titleMatch = rawText.match(/^Title:\s*(.+)$/m);
  if (titleMatch?.[1]) {
    return sanitizeTitleCandidate(titleMatch[1]);
  }

  const lineCandidate = findTitleCandidateFromLines(rawText);
  if (lineCandidate) {
    return sanitizeTitleCandidate(lineCandidate);
  }

  const firstMeaningful = paragraphs.find((paragraph) => paragraph.length >= 8);
  if (firstMeaningful) {
    return sanitizeTitleCandidate(trimSentenceEnding(firstMeaningful));
  }

  try {
    const url = new URL(fallbackUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '未命名卡片';
  }
};

const filterRedundantParagraphs = (paragraphs = []) => paragraphs.filter((paragraph, index, allParagraphs) => {
  const comparable = normalizeComparableLoose(paragraph);
  if (!comparable) {
    return false;
  }

  const leadComparable = getLeadComparable(paragraph);
  const duplicatedByLead = allParagraphs.some((candidate, candidateIndex) => {
    if (candidateIndex === index) {
      return false;
    }

    const candidateLead = getLeadComparable(candidate);
    const candidateComparable = normalizeComparableLoose(candidate);
    return (
      leadComparable &&
      candidateLead &&
      leadComparable === candidateLead &&
      candidateComparable.length > comparable.length + 20
    );
  });

  if (duplicatedByLead) {
    return false;
  }

  const wrappedByLongerParagraph = allParagraphs.some((candidate, candidateIndex) => {
    if (candidateIndex === index) {
      return false;
    }

    const candidateComparable = normalizeComparableLoose(candidate);
    return candidateComparable.length > comparable.length + 24 && candidateComparable.includes(comparable);
  });

  if (wrappedByLongerParagraph) {
    return false;
  }

  const isTruncatedSnippet = /(\.{3,}|…)$/.test(paragraph) || !/[。！？]$/.test(paragraph);
  if (!isTruncatedSnippet) {
    return true;
  }

  return !allParagraphs.some((candidate, candidateIndex) => {
    if (candidateIndex === index) {
      return false;
    }

    const candidateComparable = normalizeComparableLoose(candidate);
    return candidateComparable.length > comparable.length + 20 && candidateComparable.includes(comparable);
  });
});

const sanitizeParagraphs = (paragraphs = [], title = '') => {
  const normalizedTitle = String(title || '').replace(/\s+/g, '').trim();

  const cleanedParagraphs = dedupeParagraphs(paragraphs
    .map((paragraph) => cleanImportedParagraph(paragraph))
    .map((paragraph) => paragraph.replace(/\s*(来源[:：].*)$/, '').trim())
    .filter(Boolean)
    .filter((paragraph) => !/^\[?Image/i.test(paragraph))
    .filter((paragraph) => !/^!Image/i.test(paragraph))
    .filter((paragraph) => !/!\[Image/i.test(paragraph))
    .filter((paragraph) => !/\[[^\]]*\]\(http/i.test(paragraph))
    .filter((paragraph) => !/^(扫描分享|扫一扫分享本页)/.test(paragraph))
    .filter((paragraph) => !isNavigationParagraph(paragraph))
    .filter((paragraph) => !isEndingNoiseParagraph(paragraph))
    .filter((paragraph) => !/(Languages|English|Русский|日本語|Deutsch|Français|Español|العربية|微言教育|无障碍浏览)/.test(paragraph))
    .filter((paragraph) => {
      const normalizedParagraph = paragraph.replace(/\s+/g, '').trim();
      if (!normalizedParagraph) {
        return false;
      }

      if (normalizedTitle && normalizedParagraph === normalizedTitle) {
        return false;
      }

      if (/^(当前位置|首\s*页|首页|新闻|教育部)$/.test(paragraph)) {
        return false;
      }

      return true;
    }));

  return filterRedundantParagraphs(cleanedParagraphs);
};

const parseImportedText = (rawText = '', url = '') => {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n');
  const markdownIndex = normalized.indexOf('Markdown Content:');
  const bodyText = markdownIndex >= 0
    ? normalized.slice(markdownIndex + 'Markdown Content:'.length).trim()
    : normalized;

  const lines = extractStructuredBodyLines(bodyText.split('\n'), url);
  const rawParagraphs = groupLinesToParagraphs(lines);
  const title = extractTitle(normalized, rawParagraphs, url);
  const paragraphs = filterTopicRelevantParagraphs(
    title,
    extractPrimaryBodyParagraphs(sanitizeParagraphs(rawParagraphs, title), url)
  );

  if (isLikelyAggregatePage(title, paragraphs, url)) {
    throw new Error('当前链接更像专题页或导航页，请换成具体文章链接后再抓取。');
  }

  if (paragraphs.length <= 1 && isTruncatedSnippetParagraph(paragraphs[0] || '')) {
    throw new Error('当前页面只抓到了摘要或列表片段，请换成具体正文页后再抓取。');
  }

  const date = extractDate(normalized) || extractDate(paragraphs.join('\n')) || '';
  const detailContent = paragraphs.join('\n\n').trim();
  const summary = buildSummary(title, paragraphs);

  if (!detailContent) {
    throw new Error('没有抓到可用正文，请换一个网页链接或手动粘贴内容。');
  }

  return {
    title,
    date,
    summary,
    content: summary,
    detailContent
  };
};

export const importCardFromUrl = async (inputUrl = '') => {
  const normalizedUrl = normalizeUrl(inputUrl);
  if (!normalizedUrl) {
    throw new Error('链接格式不正确');
  }

  const proxyUrl = `${JINA_PREFIX}${normalizedUrl.replace(/^https?:\/\//i, '')}`;
  const response = await fetch(proxyUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/plain, text/markdown;q=0.9, text/html;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error('抓取失败，请稍后重试');
  }

  const rawText = await response.text();
  return {
    ...parseImportedText(rawText, normalizedUrl),
    sourceUrl: normalizedUrl
  };
};

export const repairImportedCard = (card) => {
  if (!card || card.source !== '自定义') {
    return card;
  }

  const sourceUrl = normalizeUrl(card.sourceUrl || '');
  if (!sourceUrl) {
    return card;
  }

  const primaryText = String(card.detailContent || '').trim();
  const fallbackText = [card.content, card.summary].filter(Boolean).join('\n');
  const rawText = primaryText.length >= 120 ? primaryText : [primaryText, fallbackText].filter(Boolean).join('\n');
  const rawParagraphs = groupLinesToParagraphs(extractStructuredBodyLines(String(rawText || '').split('\n'), sourceUrl));
  const titleCandidate = extractTitle(rawText, rawParagraphs, sourceUrl);
  const paragraphs = filterTopicRelevantParagraphs(
    titleCandidate,
    extractPrimaryBodyParagraphs(sanitizeParagraphs(rawParagraphs, titleCandidate), sourceUrl)
  );

  if (paragraphs.length === 0) {
    return card;
  }

  if (isLikelyAggregatePage(titleCandidate, paragraphs, sourceUrl)) {
    const currentTitle = String(card.title || '').trim();
    const fallbackTitle = !currentTitle || currentTitle.length <= 4 ? (titleCandidate || '未命名卡片') : currentTitle;
    const fallbackSummary = '当前链接识别为专题页或导航页，未自动生成正文，请改用具体文章链接重新抓取。';

    return {
      ...card,
      title: fallbackTitle,
      summary: fallbackSummary,
      content: fallbackSummary,
      detailContent: fallbackSummary
    };
  }

  const currentTitle = String(card.title || '').trim();
  const shouldReplaceTitle = !currentTitle || currentTitle.length <= 4 || /政府门户网站|未命名卡片|^图解/.test(currentTitle);
  const fixedTitle = shouldReplaceTitle ? titleCandidate : sanitizeTitleCandidate(currentTitle);
  const fixedDate = card.date || extractDate(rawText) || '';
  const fixedSummary = buildSummary(fixedTitle, paragraphs);

  return {
    ...card,
    title: fixedTitle,
    date: fixedDate || card.date,
    summary: fixedSummary,
    content: fixedSummary,
    detailContent: paragraphs.join('\n\n')
  };
};

export { normalizeUrl };
