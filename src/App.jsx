﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import HomePage from './components/HomePage';
import SearchBar from './components/SearchBar';
import Timeline from './components/Timeline';
import { normalizeQuestionBank } from './lib/questionUtils';
import { normalizeUrl, repairImportedCard } from './lib/cardImport';
import { findDuplicateCard } from './lib/cardDuplicate';
import './App.css';

const APP_STORAGE_KEY = 'edu-policy-app-state-v2';

const createCustomCardKey = (card) => [
  String(card?.title || '').trim(),
  String(card?.date || '').trim(),
  String(card?.content || '').trim(),
  String(card?.sourceUrl || '').trim()
].join('::');

const dedupeCustomCards = (cards = []) => {
  const seen = new Set();

  return cards.filter((card) => {
    if (!card || card.source !== '自定义') {
      return false;
    }

    const normalizedCard = repairImportedCard(card);
    const key = createCustomCardKey(normalizedCard);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  }).map((card) => repairImportedCard(card));
};

const mergeCustomCards = (baseList = [], customCards = []) => {
  const dedupedCustomCards = dedupeCustomCards(customCards);
  const filteredCustomCards = dedupedCustomCards.filter((item) => {
    const duplicateResult = findDuplicateCard(baseList, item);
    return !duplicateResult;
  });
  const customKeys = new Set(filteredCustomCards.map(createCustomCardKey));
  const baseItems = baseList.filter((item) => item.source !== '自定义' || !customKeys.has(createCustomCardKey(item)));

  return [...filteredCustomCards, ...baseItems].map(ensureStructuredCard);
};

const normalizeArticleText = (value = '') => String(value || '')
  .replace(/\r\n/g, '\n')
  .replace(/[ \t]+/g, ' ')
  .trim();

const normalizeParagraphText = (value = '') => String(value || '')
  .replace(/\r\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const splitArticleSentences = (content = '') => (
  normalizeArticleText(content)
    .split('\n')
    .flatMap((line) => line.match(/[^。！？；\n]+[。！？；]?/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean)
);

const trimSentenceEnding = (value = '') => String(value || '').trim().replace(/[。！？；]+$/g, '');

const splitFocusItems = (value = '') => String(value || '')
  .replace(/以及/g, '、')
  .replace(/和/g, '、')
  .replace(/[，,；;]/g, '、')
  .split('、')
  .map((item) => item.trim())
  .filter(Boolean);

const extractFocusItems = (content = '') => {
  const normalized = normalizeArticleText(content);
  const patterns = [
    /(?:强调|提出|要求|明确|部署|指出|围绕|聚焦)([^。；]+)/,
    /(?:重点(?:关注|了解|部署|聚焦|推进)?)([^。；]+)/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1]
        .replace(/^(在|对|把|将|就|要|围绕)/, '')
        .replace(/(等)?(情况|工作|任务|内容|事项|重点任务|重点工作|方向).*$/, '')
        .trim();
      const items = splitFocusItems(cleaned);
      if (items.length > 0) {
        return items.slice(0, 6);
      }
    }
  }

  return [];
};

const joinFocusItems = (items = []) => items.filter(Boolean).join('、');

const inferWrapUpParagraph = (title = '', content = '') => {
  const combined = `${title} ${content}`;

  if (/调研/.test(combined)) {
    return '相关调研围绕重点任务落实、资源配置优化和教育改革推进等内容展开，进一步了解一线情况和实际进展。';
  }

  if (/(会议|部署会|推进会|工作会)/.test(combined)) {
    return '会议把重点任务部署和后续推进要求统筹起来，进一步明确了相关领域的工作方向。';
  }

  if (/(招生|考试)/.test(combined)) {
    return '有关部署把规范管理、服务保障和优化结构结合起来，对后续工作推进提出了明确要求。';
  }

  if (/(会见|对话|交流|发布仪式|大会|典礼)/.test(combined)) {
    return '活动围绕相关领域合作交流、能力培养和协同发展等内容进行了沟通与介绍。';
  }

  if (/(公报|报告|发布)/.test(combined)) {
    return '相关内容集中反映了该领域的发展情况和重点信息，为后续工作提供了参考。';
  }

  return '相关内容围绕重点任务推进和工作安排展开，进一步明确了后续工作的着力点。';
};

const buildAutoDetailContent = (card, sentences = []) => {
  const normalized = normalizeArticleText(card?.content);
  if (!normalized) {
    return '';
  }

  const sentenceList = sentences.length > 0 ? sentences : splitArticleSentences(normalized);
  const paragraphs = [];

  if (sentenceList[0]) {
    paragraphs.push(sentenceList[0]);
  }

  if (sentenceList[1]) {
    paragraphs.push(sentenceList[1]);
  }

  const focusItems = extractFocusItems(sentenceList.slice(1).join('') || normalized);
  if (focusItems.length > 0) {
    const prefix = /调研/.test(card?.title || normalized)
      ? '重点内容主要涉及'
      : /(招生|考试)/.test(card?.title || normalized)
        ? '有关部署主要涉及'
        : '重点内容主要围绕';
    paragraphs.push(`${prefix}${joinFocusItems(focusItems)}等方面展开。`);
  }

  paragraphs.push(inferWrapUpParagraph(card?.title || '', normalized));

  return paragraphs
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join('\n\n');
};

const buildSummaryFromContent = (title = '', content = '') => {
  const normalized = normalizeArticleText(content);
  if (!normalized) {
    return '';
  }

  const focusMatch = normalized.match(/(?:重点了解|重点关注|重点聚焦|围绕|聚焦|部署|强调)([^。；]+)/);
  if (focusMatch?.[1]) {
    const focusText = focusMatch[1]
      .replace(/^(在|对|将|就)/, '')
      .replace(/(等)?(情况|任务|工作|内容|议题|重点任务|重点工作|方面).*$/, '')
      .replace(/、+/g, '、')
      .trim()
      .replace(/^、|、$/g, '');

    if (focusText) {
      const shortTitle = String(title || '').replace(/[《》“”"']/g, '');
      return `${shortTitle}，重点关注${focusText}。`;
    }
  }

  return splitArticleSentences(normalized)[0] || normalized;
};

const buildDetailContentFromContent = (card) => {
  const normalized = normalizeArticleText(card?.content);
  if (!normalized) {
    return '';
  }

  const existingParagraphs = normalized
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (existingParagraphs.length > 1) {
    return existingParagraphs.join('\n\n');
  }

  const sentences = splitArticleSentences(normalized);
  if (sentences.length <= 2) {
    return buildAutoDetailContent(card, sentences);
  }

  const paragraphs = [];
  let currentGroup = [];

  const shouldStartNewParagraph = (sentence) => /^(在|对|对于|围绕|调研中|会上|会议指出|会议强调|他强调|他指出|同时|此外)/.test(sentence);

  sentences.forEach((sentence) => {
    if (currentGroup.length > 0 && (shouldStartNewParagraph(sentence) || currentGroup.join('').length >= 72)) {
      paragraphs.push(currentGroup.join(''));
      currentGroup = [sentence];
      return;
    }

    currentGroup.push(sentence);
  });

  if (currentGroup.length > 0) {
    paragraphs.push(currentGroup.join(''));
  }

  const mergedParagraphs = [];
  paragraphs.forEach((paragraph) => {
    if (mergedParagraphs.length > 0 && paragraph.length < 26) {
      mergedParagraphs[mergedParagraphs.length - 1] += paragraph;
      return;
    }

    mergedParagraphs.push(paragraph);
  });

  return mergedParagraphs.join('\n\n');
};

const ensureStructuredCard = (card) => {
  if (!card) {
    return card;
  }

  const content = normalizeArticleText(card.content);
  const summary = normalizeArticleText(card.summary) || buildSummaryFromContent(card.title, content);
  const detailContent = normalizeParagraphText(card.detailContent) || buildDetailContentFromContent({ ...card, content });

  return {
    ...card,
    content,
    summary,
    detailContent
  };
};

const DEFAULT_NEWS_LIST = [
  {
    id: 1,
    title: '2025年全国教育工作会议',
    content: '2025年1月9日至10日，2025年全国教育工作会议在北京召开并闭幕。会议围绕贯彻全国教育大会精神、实施教育强国建设规划纲要、部署年度重点任务展开，是 2025 年教育系统工作的总牵引。',
    summary: '2025年全国教育工作会议聚焦教育强国建设年度主线，强调围绕规划纲要细化施工图、抓好立德树人、教育科技人才一体推进和教育综合改革。',
    detailContent: '1月9日至10日，2025年全国教育工作会议在北京召开并闭幕。会议围绕深入学习贯彻全国教育大会精神，总结2024年教育工作，分析当前形势，研究部署2025年重点任务，进一步统一思想、明确主线、凝聚共识。\n\n会议强调，要全面把握教育的政治属性、人民属性、战略属性，切实把党中央关于教育改革发展的重大部署落实到位，稳扎稳打推进教育强国建设。会议明确，2025年工作的关键在于围绕教育强国建设规划纲要，把总体目标进一步细化为年度任务、具体路径和落地举措。\n\n会议提出，要突出实干为先，抓好立德树人这个根本任务，统筹推进教育、科技、人才一体发展，完善教育公共服务体系，推动教育高质量发展。与此同时，要强化目标导向、问题导向和效果导向，盯住重点任务和主攻领域，以钉钉子精神抓落实，确保年度部署真正落地见效。\n\n会议还强调，要进一步深化教育综合改革和试点探索，鼓励各地把试点经验转化为制度成果，提升教育强国建设执行力。岁末年初还要守好教育安全底线，统筹做好学生离校返乡、假期留校和校园安全等工作。',
    category: '政策法规',
    date: '2025-01-10',
    source: '教育部',
    cardType: 'official',
    hotness: 98,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/xw_zt/moe_357/2025/2025_zt01/',
    references: [
      { label: '教育部专题页', url: 'https://www.moe.gov.cn/jyb_xwfb/xw_zt/moe_357/2025/2025_zt01/' },
      { label: '会议召开', url: 'https://fx.xwapp.moe.gov.cn/article/202501/677fc73195e2352a57702836.html' },
      { label: '会议闭幕', url: 'https://hudong.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202501/t20250110_1175123.html' },
      { label: '中国教育报评论转载', url: 'https://www.cse.edu.cn/index/detail.html?category=31&id=4139' }
    ]
  },
  {
    id: 2,
    title: '2025年驻外使领馆教育工作会议召开',
    content: '2025年1月，教育部召开驻外使领馆教育工作会议，聚焦实施教育强国建设规划纲要、推进高水平教育国际交流合作。怀进鹏与代表交流座谈并讲话。',
    category: '教育国际',
    date: '2025-01-11',
    source: '教育部',
    cardType: 'official',
    hotness: 82,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202501/t20250113_1175458.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202501/t20250113_1175458.html' }
    ]
  },
  {
    id: 3,
    title: '怀进鹏出席北京市教育大会',
    content: '2025年2月17日，怀进鹏出席北京市教育大会并讲话，强调贯彻全国教育大会精神、发展具有首都特点中国特色世界水平的现代教育，对地方落实教育强国任务具有风向标意义。',
    category: '教育管理',
    date: '2025-02-17',
    source: '教育部',
    cardType: 'official',
    hotness: 84,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202502/t20250217_1179456.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202502/t20250217_1179456.html' }
    ]
  },
  {
    id: 4,
    title: '2025年高校科技创新与新型研究型大学建设调研',
    content: '2025年2月24日，怀进鹏赴深圳调研高校科技创新、新型研究型大学建设等工作，强调高等教育要更好支撑科技进步、产业升级和国家战略需求。',
    category: '高等教育',
    date: '2025-02-24',
    source: '教育部',
    cardType: 'official',
    hotness: 86,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202502/t20250224_1180181.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202502/t20250224_1180181.html' },
      { label: '深圳市教育局转载', url: 'https://szeb.sz.gov.cn/home/jyxw/jyxw/content/post_12040897.html' },
      { label: '澎湃政务转载', url: 'https://www.thepaper.cn/newsDetail_forward_30229227' }
    ]
  },
  {
    id: 5,
    title: '2025年研究生招生复试录取与高考招生工作部署',
    content: '2025年2月至3月，教育部围绕研究生复试录取和普通高校招生工作连续发布部署文件，强调考试招生安全、公平、公正，优化学科专业与招生计划安排，完善考生服务和录取机制。',
    summary: '教育部连续部署研究生复试录取和高校招生工作，重点强调公平公正、规范录取、优化服务，以及调剂系统和招生计划安排等关键环节。',
    detailContent: '2025年2月至3月，教育部围绕硕士研究生复试录取和普通高校招生工作连续作出部署，重点要求各地各招生单位坚持综合评价、择优录取，严格执行政策，规范录取行为，强化监督管理，确保考试招生工作公平、公正、科学。\n\n在研究生复试录取工作方面，教育部发布了2025年全国硕士研究生招生考试考生进入复试的初试成绩基本要求，即国家分数线。各招生单位要在国家分数线基础上，结合招生计划和培养要求，自主确定本单位考生进入复试的初试成绩要求及相关学术要求，并及时向社会公布。\n\n同时，教育部明确了调剂安排：调剂意向采集系统于3月28日开通，调剂服务系统于4月8日开通。各招生单位在第一志愿合格生源不足时，可按规定组织调剂；所有调剂申请均须通过教育部调剂服务系统统一进行，考生需密切关注研招网和招生单位发布的相关信息。\n\n在普通高校招生工作部署中，教育部同步强调统筹发展和安全，进一步优化学科专业与招生计划安排，提高人才培养与国家战略、区域发展和民生需求的适配度，并持续完善考生服务、录取管理和信息公开机制，确保招生工作规范有序推进。',
    category: '考试招生',
    date: '2025-02-24',
    source: '中国教育考试网',
    cardType: 'official',
    hotness: 94,
    verifiedSourceUrl: 'https://www.neea.edu.cn/html1/report/2503/58-1.htm',
    references: [
      { label: '研究生复试录取工作部署', url: 'https://www.neea.edu.cn/html1/report/2503/58-1.htm' },
      { label: '做好2025年普通高校招生工作通知', url: 'https://www.neea.edu.cn/html1/report/2503/56-1.htm' },
      { label: '普通高校招生工作部署解读', url: 'https://www.neea.edu.cn/html1/report/2502/19-1.htm' },
      { label: '中国教育在线收录', url: 'https://m.eol.cn/kaoyan/202502/t20250224_2655736.shtml' }
    ]
  },
  {
    id: 6,
    title: '2025年教育系统全面从严治党工作视频会议召开',
    content: '2025年2月26日，教育系统全面从严治党工作视频会议召开。怀进鹏就纵深推进教育系统全面从严治党、为教育强国建设提供坚强保障作出部署。',
    category: '教育党建',
    date: '2025-02-26',
    source: '教育部',
    cardType: 'official',
    hotness: 83,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202502/t20250226_1180521.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202502/t20250226_1180521.html' },
      { label: 'MBAChina收录', url: 'https://www.mbachina.com/html/xw/202502/611727.html' }
    ]
  },
  {
    id: 7,
    title: '2025年度全国基础教育重点工作部署会召开',
    content: '2025年2月，教育部召开全国基础教育重点工作部署会，部署基础教育扩优提质、“双减”巩固、规范管理、教材建设、数字化应用和校园安全等重点任务。',
    summary: '2025年度全国基础教育重点工作部署会明确八项重点任务，涵盖立德树人、扩优提质、“双减”、规范管理、教材建设、数字化应用、综合改革和校园安全。',
    detailContent: '2025年度全国基础教育重点工作部署会在深圳召开，会议围绕深入贯彻全国教育大会精神，对基础教育领域全年工作作出系统安排。会议提出，2025年要锚定建立公平优质基础教育体系的目标，统筹发展与安全，坚持守正固本和改革创新，推动教育强国建设规划纲要及三年行动计划在基础教育领域高起点开局、高质量推进。\n\n会议明确，2025年基础教育工作要重点抓好八个方面：一是抓好立德树人根本任务落实，健全德智体美劳全面培养体系；二是抓紧基础教育扩优提质行动实施，既扩充优质资源“顶部”，也抬高薄弱学校“底部”；三是抓实“双减”成果巩固，推进校内减负提质；四是抓严基础教育规范管理，开展规范管理提升年行动。\n\n此外，会议还要求抓牢新时代教材体系建设，深入推进习近平新时代中国特色社会主义思想进课程教材；抓深教育数字化应用，建好用好国家中小学智慧教育平台和基础教育管理服务平台；抓稳基础教育综合改革，推进资源配置优化、家校社协同育人等试点；抓细校园安全，实施“护苗行动”，建设平安校园。\n\n会议同时强调，各地要把年度重点任务转化为具体行动方案，加强统筹协调和工作调度，确保基础教育改革发展各项任务有序落地。',
    category: '基础教育',
    date: '2025-02-27',
    source: '教育部',
    cardType: 'official',
    hotness: 87,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202502/t20250227_1180634.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202502/t20250227_1180634.html' }
    ]
  },
  {
    id: 8,
    title: '2025年教育数字化与人工智能赋能教育系列动态',
    content: '2025年3月至5月，教育部围绕人工智能与教育变革连续推进国家教育数字化战略行动。既有国家教育数字化战略行动 2025 年部署会，也有世界数字教育大会主旨演讲与国际对话，主题集中在人工智能赋能教育强国建设。',
    category: '教育技术',
    date: '2025-05-15',
    source: '教育部',
    cardType: 'official',
    hotness: 97,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202503/t20250328_1185222.html',
    references: [
      { label: '国家教育数字化战略行动2025年部署会', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202503/t20250328_1185222.html' },
      { label: '怀进鹏在2025世界数字教育大会作主旨演讲', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202505/t20250515_1190601.html' },
      { label: '怀进鹏出席中国—东盟教育部长对话会', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202505/t20250515_1190757.html' },
      { label: '国研网镜像收录', url: 'https://guoyanwang.clcn.net.cn/DRCNet.Mirror.Documents.Web/DocSummary.aspx?DocID=7822252&leafID=2474' }
    ]
  },
  {
    id: 9,
    title: '怀进鹏调研高校毕业生就业、人才供需适配和经费监管工作',
    content: '2025年4月1日，怀进鹏调研教育部学生服务与素质发展中心、经费监管事务中心，围绕高校毕业生就业、国家人才供需对接大数据平台和经费监管等工作作出部署。',
    category: '就业与人才',
    date: '2025-04-01',
    source: '教育部',
    cardType: 'official',
    hotness: 88,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202504/t20250401_1185792.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202504/t20250401_1185792.html' }
    ]
  },
  {
    id: 10,
    title: '怀进鹏调研教育评价与外语教育工作',
    content: '2025年4月，怀进鹏先后调研教育部教育质量评估中心、北京外国语大学，强调评估“指挥棒”作用和高水平外语教育、国际传播能力建设。',
    category: '教育评价',
    date: '2025-04-08',
    source: '教育部',
    cardType: 'official',
    hotness: 80,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_zzjg/huodong/202504/t20250408_1186541.html',
    references: [
      { label: '调研教育质量评估中心和北京外国语大学', url: 'https://www.moe.gov.cn/jyb_zzjg/huodong/202504/t20250408_1186541.html' },
      { label: '怀进鹏调研活动栏目', url: 'https://www.moe.gov.cn/jyb_zzjg/moe_187/huaijinpeng/diaoyan/' }
    ]
  },
  {
    id: 11,
    title: '2025年全国教育政策法治工作会召开',
    content: '2025年4月10日至11日，全国教育政策法治工作会议召开，围绕教育法典编纂研究、教育立法、依法治校、教育法治服务改革发展等重点任务作出部署。',
    category: '政策法规',
    date: '2025-04-14',
    source: '教育部',
    cardType: 'official',
    hotness: 79,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202504/t20250414_1187278.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202504/t20250414_1187278.html' }
    ]
  },
  {
    id: 12,
    title: '怀进鹏在国家教育行政学院调研座谈',
    content: '2025年4月18日，在国家教育行政学院建院 70 周年之际，怀进鹏看望老教师并与教职工、学员代表座谈，强调教育干部和教师培训对教育强国建设的重要支撑作用。',
    category: '教师发展',
    date: '2025-04-18',
    source: '教育部',
    cardType: 'official',
    hotness: 78,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202504/t20250419_1187935.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202504/t20250419_1187935.html' }
    ]
  },
  {
    id: 13,
    title: '2025年学校体育卫生艺术国防教育与高考安全工作部署',
    content: '2025年4月25日，教育部同日推进学校体育卫生艺术国防教育和高考安全工作，既强调学生体质健康、美育和国防教育，也全面动员部署高考安全保障和考试组织工作。',
    category: '教育管理',
    date: '2025-04-25',
    source: '教育部 / 中国教育考试网',
    cardType: 'official',
    hotness: 89,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202504/t20250425_1188671.html',
    references: [
      { label: '全国学校体育卫生艺术国防教育工作会议', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202504/t20250425_1188671.html' },
      { label: '2025年全国普通高校招生考试安全工作视频会议', url: 'https://www.neea.edu.cn/xhtml1/report/2505/39-1.htm' },
      { label: 'MBAChina高考工作转载', url: 'https://www.mbachina.com/html/xw/202506/621537.html' }
    ]
  },
  {
    id: 14,
    title: '怀进鹏调研新疆教育工作',
    content: '2025年5月10日至13日，怀进鹏赴新疆调研铸牢中华民族共同体意识教育、国家通用语言文字教育、教育数字化、高校学科建设、思政教育、毕业生就业和校园安全等工作。',
    category: '教育管理',
    date: '2025-05-14',
    source: '教育部',
    cardType: 'official',
    hotness: 91,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202505/t20250514_1190500.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202505/t20250514_1190500.html' },
      { label: 'MBAChina转载', url: 'https://www.mbachina.com/html/xw/20250515/618869.html' }
    ]
  },
  {
    id: 15,
    title: '怀进鹏会见中亚国家教育部长并出席区域教育合作活动',
    content: '2025年5月，围绕首届中国—中亚教育部长会议和相关多边机制，怀进鹏密集会见多国教育部长，推动高等教育、职业教育、数字教育、语言教学和人文交流合作。',
    category: '教育国际',
    date: '2025-05-15',
    source: '教育部',
    cardType: 'official',
    hotness: 85,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202505/t20250513_1190441.html',
    references: [
      { label: '会见部分中亚国家教育部部长', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202505/t20250513_1190441.html' },
      { label: '中国—东盟教育部长对话会', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202505/t20250515_1190757.html' }
    ]
  },
  {
    id: 16,
    title: '2025年高考护航与高考首日组织调度',
    content: '2025年5月至6月，教育部围绕高考开展“护航行动”，并在高考首日通过国家教育考试指挥平台调度全国高考组织工作，重点聚焦安全平稳、考生服务和考试数智化建设。',
    summary: '教育部部署开展“2025高考护航行动”，把服务保障、环境治理、诚信考试、志愿填报服务和高考首日调度统筹推进。',
    detailContent: '教育部在2025年高考前部署开展“2025高考护航行动”，要求各地教育部门和招生考试机构会同宣传、网信、公安等有关部门，进一步优化考试服务保障，加强正向宣传引导，确保高考安全平稳举行、考生顺利应考。\n\n根据部署，高考期间各地将围绕考生实际需求，强化治安、出行、食宿、医疗卫生、噪声治理等综合服务保障。对残疾人等特殊困难群体，要提供合理便利；对备考赴考中的现实困难，要通过设置手机、书包等物品存放点等方式提升服务温度。\n\n与此同时，各地还将持续开展考点周边环境治理、考试诚信教育和涉考违法违规行为打击工作，重点做好信息发布、政策解读、温馨提示和辟谣预警，营造规范有序、温馨和谐的考试环境。考后还将继续提供免费优质、便捷易用的志愿填报服务，举办咨询会、宣讲会，拓展电话咨询、网络咨询、直播等服务渠道，并进一步优化“阳光志愿”信息服务。\n\n在高考首日，教育部通过国家教育考试指挥平台调度全国高考组织工作，继续把考试安全、考生服务和考试数智化建设作为重点，确保高考组织平稳有序。',
    category: '考试招生',
    date: '2025-06-07',
    source: '教育部 / 中国教育考试网',
    cardType: 'official',
    hotness: 96,
    verifiedSourceUrl: 'https://www.neea.edu.cn/xhtml1/report/2505/84-1.htm',
    references: [
      { label: '教育部部署开展“2025高考护航行动”', url: 'https://www.neea.edu.cn/xhtml1/report/2505/84-1.htm' },
      { label: '高考首日怀进鹏视频调度全国高考组织工作', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202506/t20250607_1193336.html' },
      { label: '中国教育在线收录', url: 'https://www.eol.cn/news/yaowen/202506/t20250607_2673254.shtml' }
    ]
  },
  {
    id: 17,
    title: '2024年全国教育事业发展统计公报发布',
    content: '2025年6月11日，教育部发布《2024年全国教育事业发展统计公报》。公报披露全国教育规模、结构和质量发展情况，是判断教育宏观趋势的重要基础数据来源。',
    category: '教育统计',
    date: '2025-06-11',
    source: '教育部',
    cardType: 'official',
    hotness: 92,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_sjzl/sjzl_fztjgb/202506/t20250611_1193760.html',
    references: [
      { label: '统计公报原文', url: 'https://www.moe.gov.cn/jyb_sjzl/sjzl_fztjgb/202506/t20250611_1193760.html' },
      { label: '教育发展统计公报栏目', url: 'https://www.moe.gov.cn/jyb_sjzl/sjzl_fztjgb/' },
      { label: '湖南教育电视台收录', url: 'https://www.hnedutv.com/content/13979065' }
    ]
  },
  {
    id: 18,
    title: '怀进鹏赴吉林调研高校毕业生就业与基础教育资源配置',
    content: '2025年6月11日至12日，怀进鹏赴吉林调研高校毕业生就业、民办高校党建、高校思政教育、“双一流”建设和基础教育资源配置，强调千方百计扩大高校毕业生就业岗位。',
    category: '就业与人才',
    date: '2025-06-13',
    source: '教育部',
    cardType: 'official',
    hotness: 87,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202506/t20250613_1194054.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202506/t20250613_1194054.html' },
      { label: '黑龙江省教育厅转载', url: 'https://jyt.hlj.gov.cn/jyt/c110480/202506/c00_31849016.shtml' },
      { label: 'MBAChina转载', url: 'https://www.mbachina.com/html/xw/202506/623118.html' }
    ]
  },
  {
    id: 19,
    title: '教育部召开年中推进会',
    content: '2025年7月21日，教育部召开年中推进会，盘点《加快建设教育强国三年行动计划（2025—2027年）》重点任务进展成效，部署下半年和下一阶段重点工作。',
    category: '政策法规',
    date: '2025-07-22',
    source: '教育部',
    cardType: 'official',
    hotness: 86,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202507/t20250722_1198992.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202507/t20250722_1198992.html' },
      { label: 'MBAChina转载', url: 'https://www.mbachina.com/html/xw/202507/626174.html' }
    ]
  },
  {
    id: 20,
    title: '怀进鹏会见俄罗斯科学和高等教育部部长法利科夫',
    content: '2025年8月25日，怀进鹏会见俄罗斯科学和高等教育部部长法利科夫，围绕中俄教育合作、联合培养、科研合作和语言教学等议题交换意见。',
    category: '教育国际',
    date: '2025-08-25',
    source: '教育部',
    cardType: 'official',
    hotness: 76,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202508/t20250825_1410535.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202508/t20250825_1410535.html' },
      { label: '中国教育在线转载', url: 'https://www.eol.cn/news/yaowen/202508/t20250826_2686631.shtml' },
      { label: '证券时报快讯', url: 'https://stcn.com/article/detail/3260445.html' }
    ]
  },
  {
    id: 21,
    title: '2026年硕士研究生考试招生工作系列部署',
    content: '2025年9月至11月，教育部围绕 2026 年硕士研究生考试招生连续作出部署，涵盖招生工作管理规定、报名时间安排和考试安全工作，持续强调全过程规范管理与考试安全。',
    category: '考试招生',
    date: '2025-11-25',
    source: '中国教育考试网',
    cardType: 'official',
    hotness: 90,
    verifiedSourceUrl: 'https://www.neea.edu.cn/html1/report/2509/58-1.htm',
    references: [
      { label: '2026年硕士研究生考试招生工作部署', url: 'https://www.neea.edu.cn/html1/report/2509/58-1.htm' },
      { label: '2026年硕士研究生招生考试安全工作', url: 'https://www.neea.edu.cn/xhtml1/report/2511/127-1.htm' }
    ]
  },
  {
    id: 22,
    title: '怀进鹏会见参加2025世界中文大会的外方嘉宾',
    content: '2025年11月14日，怀进鹏在北京会见参加 2025 世界中文大会的外方嘉宾，围绕国际中文教育、文明互鉴和教育合作展开交流。',
    category: '教育国际',
    date: '2025-11-14',
    source: '教育部',
    cardType: 'official',
    hotness: 72,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202511/t20251114_1420381.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202511/t20251114_1420381.html' },
      { label: '教育涉外监管信息网转载', url: 'https://jsj.moe.gov.cn/n2/7001/7001/2058.shtml' },
      { label: '中国教育报电子版', url: 'https://paper.jyb.cn/zgjyb/html/2025-11/15/content_144740_19048232.htm' }
    ]
  },
  {
    id: 23,
    title: '怀进鹏调研教育部留学服务中心',
    content: '2025年11月，怀进鹏调研教育部留学服务中心，强调提升留学人员服务能力、擦亮“留学中国”品牌、服务高水平教育对外开放。',
    summary: '怀进鹏调研教育部留学服务中心，重点强调提升留学服务能力、打造“留学中国”品牌，并更好服务高水平教育对外开放。',
    detailContent: '2025年11月，怀进鹏调研教育部留学服务中心，围绕新时代留学服务工作和教育对外开放任务进行了解。调研重点涉及留学人员服务体系建设、服务能力提升和品牌塑造等内容。\n\n调研中强调，要进一步提升留学服务的专业化、精细化水平，更好回应留学人员在学历认证、回国发展、国际交流等方面的实际需求，不断增强服务的便利性、规范性和质量水平。\n\n同时，要持续擦亮“留学中国”品牌，把留学服务工作更好融入高水平教育对外开放大局，提升服务支撑能力。',
    category: '教育国际',
    date: '2025-11-21',
    source: '教育部',
    cardType: 'official',
    hotness: 73,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202511/t20251121_1421134.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202511/t20251121_1421134.html' },
      { label: '教育部留学服务中心转载', url: 'https://portal.cscse.edu.cn/lxfwzx/xwdt85/xwdt/2025112114464255274/index.html' },
      { label: '新浪新闻转载', url: 'https://news.sina.com.cn/o/2025-11-21/doc-infycykc8933505.shtml' }
    ]
  },
  {
    id: 24,
    title: '全国高校科技创新工作会议暨基础学科和交叉学科突破计划启动部署会',
    content: '2025年12月2日，全国高校科技创新工作会议暨基础学科和交叉学科突破计划启动部署会召开。怀进鹏出席并讲话，强调高校科技创新、高层次人才培养和基础学科、交叉学科建设。',
    summary: '全国高校科技创新工作会议暨基础学科和交叉学科突破计划启动部署会召开，重点围绕高校科技创新、高层次人才培养以及基础学科、交叉学科建设作出部署。',
    detailContent: '2025年12月2日，全国高校科技创新工作会议暨基础学科和交叉学科突破计划启动部署会召开。会议围绕高校科技创新工作和基础学科、交叉学科突破计划启动实施进行部署，怀进鹏出席会议并讲话。\n\n会议强调，要把高校科技创新与高层次人才培养更加紧密结合起来，充分发挥高校在基础研究、原始创新和关键核心技术攻关中的作用，提升服务国家战略需求的能力。\n\n会议同时提出，要把基础学科和交叉学科建设作为重要发力点，围绕重点领域加强基础学科布局，推动学科交叉融合，提升拔尖创新人才自主培养能力。\n\n这次会议还把基础学科和交叉学科突破计划的启动部署与高校科技创新工作统筹推进，明确了学科建设、人才培养和科技创新协同发力的方向。',
    category: '高等教育',
    date: '2025-12-02',
    source: '教育部',
    cardType: 'official',
    hotness: 88,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202512/t20251203_1422209.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202512/t20251203_1422209.html' },
      { label: '中国教育电视台转载', url: 'https://www.centv.cn/p/570976.html' },
      { label: '搜狐转载', url: 'https://m.sohu.com/a/960856669_117882/' }
    ]
  },
  {
    id: 25,
    title: '2026年全国教育工作会议召开',
    content: '2026年1月8日，2026年全国教育工作会议在北京召开，围绕“十五五”开局起步，对教育强国建设、高质量教育体系建设、教育综合改革和教师队伍建设等重点任务作出部署。',
    summary: '2026年全国教育工作会议围绕“十五五”开局起步作出部署，强调立德树人、高质量教育体系、公共服务、教育改革和教育对科技人才的支撑作用。',
    detailContent: '1月8日，2026年全国教育工作会议在北京召开。会议围绕“十五五”开局起步，对教育强国建设的年度重点工作作出部署，强调要把教育放在中国式现代化全局中谋划推进，推动教育强国建设取得新的实质性进展。\n\n会议强调，要坚持以习近平新时代中国特色社会主义思想为指导，全面落实习近平总书记关于教育的重要论述和全国教育大会精神，全面把握教育的政治属性、人民属性、战略属性，坚持稳中求进工作总基调，坚决落实立德树人根本任务。\n\n会议明确，要着力强化教育对科技和人才的支撑作用，着力提升教育公共服务质量和水平，深化教育综合改革和试点探索，加快构建高质量教育体系，推动教育强国建设更好服务社会主义现代化建设，为“十五五”开好局、起好步提供有力支撑。\n\n会议同时释放出清晰信号：2026年教育工作不仅要抓主线、抓重点，更要在改革突破、服务支撑和体系建设上同步发力，把教育强国建设从总体部署进一步推进到年度实施层面。',
    category: '政策法规',
    date: '2026-01-08',
    source: '教育部',
    cardType: 'official',
    hotness: 97,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202601/t20260108_1426054.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202601/t20260108_1426054.html' }
    ]
  },
  {
    id: 26,
    title: '教育部部署做好2026年普通高校招生工作',
    content: '2026年1月，教育部印发通知部署普通高校招生工作，强调统筹发展和安全、严格规范管理、服务国家战略和民生需求，进一步提高人才培养适配度。',
    summary: '教育部部署做好2026年普通高校招生工作，强调统筹安全与发展、严格规范管理，并提升招生培养与国家战略、区域需求和民生需要的适配度。',
    detailContent: '2026年1月，教育部印发通知，对2026年普通高校招生工作作出部署。有关安排围绕统筹发展和安全、严格规范管理、优化招生培养结构等方面展开，明确了年度高校招生工作的基本要求和重点任务。\n\n通知强调，各地各高校要严格落实招生政策，进一步规范招生管理流程，切实维护招生公平公正，守住考试招生安全底线，确保高校招生工作平稳有序推进。\n\n同时，招生工作要更好服务国家战略、区域发展和民生需求，推动学科专业设置、招生计划安排与经济社会发展需要更加匹配，进一步提高人才培养的针对性和适配度。',
    category: '考试招生',
    date: '2026-01-23',
    source: '中国教育考试网',
    cardType: 'official',
    hotness: 90,
    verifiedSourceUrl: 'https://www.neea.edu.cn/xhtml1/report/2601/60-1.htm',
    references: [
      { label: '中国教育考试网原文', url: 'https://www.neea.edu.cn/xhtml1/report/2601/60-1.htm' }
    ]
  },
  {
    id: 27,
    title: '国家教育行政学院举行2026年春季开学典礼',
    content: '2026年3月，国家教育行政学院举行春季开学典礼。怀进鹏作报告，强调“十五五”开局之年教育强国建设的战略地位，以及树立全新教育观、积极识变应变的重要性。',
    summary: '国家教育行政学院举行2026年春季开学典礼，怀进鹏强调“十五五”开局之年教育强国建设的重要地位，并提出树立全新教育观、积极识变应变。',
    detailContent: '2026年3月，国家教育行政学院举行春季开学典礼。怀进鹏在开学典礼上作报告，围绕“十五五”开局之年教育改革发展形势和教育强国建设任务进行阐述。\n\n报告强调，教育在中国式现代化建设中具有基础性、战略性支撑作用。进入“十五五”开局之年，要从党和国家事业发展全局中把握教育的战略地位，进一步增强推进教育强国建设的责任感和紧迫感。\n\n同时，报告提出要树立全新的教育观，积极识变、应变、求变，主动适应科技进步、产业变革和社会发展带来的新要求，在教育理念、发展方式和治理模式上不断深化认识、推进创新。',
    category: '教育管理',
    date: '2026-03-19',
    source: '教育部',
    cardType: 'official',
    hotness: 82,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202603/t20260319_1431556.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202603/t20260319_1431556.html' },
      { label: '中国教育报电子版', url: 'https://paper.jyb.cn/zgjyb/html/2026-03/20/content_144740_19381660.htm' }
    ]
  },
  {
    id: 28,
    title: '怀进鹏出席联合国教科文组织2026年《全球教育监测报告》发布仪式',
    content: '2026年3月26日，怀进鹏出席联合国教科文组织 2026 年《全球教育监测报告》发布仪式，并就高等教育机会公平、能力培养、科研合作和全球教育共同体建设发表观点。',
    summary: '怀进鹏出席联合国教科文组织2026年《全球教育监测报告》发布仪式，围绕高等教育机会公平、能力培养、科研合作和全球教育共同体建设发表观点。',
    detailContent: '2026年3月26日，怀进鹏出席联合国教科文组织2026年《全球教育监测报告》发布仪式，并围绕全球教育发展相关议题介绍中国教育的认识和主张。\n\n发言中重点谈到高等教育机会公平问题，强调要让更多人共享高等教育发展成果，推动教育资源配置更加公平合理，增强教育在促进人的全面发展和社会流动中的作用。\n\n同时，围绕能力培养和科研合作，提出高等教育不仅要关注知识传授，还要更加重视创新能力、实践能力和复合型能力培养，并通过深化国际科研合作、学术交流和人才培养合作，共同应对全球性挑战。\n\n在全球教育共同体建设方面，发言还谈到要加强开放合作与互学互鉴，推进全球教育治理和教育可持续发展。',
    category: '教育国际',
    date: '2026-03-26',
    source: '教育部',
    cardType: 'official',
    hotness: 80,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202603/t20260327_1432191.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202603/t20260327_1432191.html' }
    ]
  },
  {
    id: 29,
    title: '国家教育数字化战略行动2026年部署会召开',
    content: '2026年3月31日，教育部召开国家教育数字化战略行动 2026 年部署会，系统总结“十四五”教育数字化成效，部署“十五五”重点任务，强调以“人工智能+教育”推动全场景变革。',
    summary: '国家教育数字化战略行动2026年部署会提出以“人工智能+教育”为抓手，推动人工智能融入教育全要素、全过程、全场景，开启教育数字化2.0。',
    detailContent: '3月31日，在国家智慧教育平台开通四周年之际，教育部召开国家教育数字化战略行动2026年部署会，系统总结“十四五”时期教育数字化建设成效，研究部署“十五五”时期重点工作。\n\n会议强调，要用好人工智能这一关键变量，以“人工智能+教育”为抓手，推动人工智能融入教育全要素、全过程、全场景，全面深入推进国家教育数字化战略行动2.0。数字化要继续服务立德树人根本任务，服务教育科技人才一体发展，服务教育公共服务品质改善，服务教师专业成长，也服务教育强国重点任务落地。\n\n会议指出，“十四五”时期国家教育数字化战略行动已经取得明显成效，国家智慧教育公共服务平台建设应用持续深化，教育数字化对教育改革发展的支撑作用进一步增强。下一阶段要在已有基础上，更加突出人工智能赋能，推动数字化从资源建设和平台应用，进一步走向教学、治理、评价和服务等多场景深度融合。\n\n会议释放的核心信号是，教育数字化下一步不只是继续扩平台、扩资源，而是要把“人工智能+教育”真正落到课堂、管理和服务场景中，推动教育数字化迈向更深层次应用。',
    category: '教育技术',
    date: '2026-03-31',
    source: '教育部',
    cardType: 'official',
    hotness: 96,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_zzjg/huodong/202603/t20260331_1432621.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_zzjg/huodong/202603/t20260331_1432621.html' },
      { label: '经济日报转载', url: 'https://www.jingjiribao.cn/static/detail.jsp?id=647229' },
      { label: '南京邮电大学转载', url: 'https://lxy.njupt.edu.cn/2026/0421/c18701a300465/page.htm' }
    ]
  },
  {
    id: 30,
    title: '怀进鹏调研广西基础教育工作',
    content: '2026年4月，怀进鹏赴广西调研基础教育工作，重点了解铸牢中华民族共同体意识教育、乡村学校建设、特殊教育、健康学校建设和人工智能赋能基础教育等情况。',
    summary: '怀进鹏赴广西调研基础教育，重点关注边境地区学校建设、铸牢中华民族共同体意识教育、人工智能赋能教学、校园食品安全以及特殊教育和专门学校规范发展。',
    detailContent: '4月13日，教育部党组书记、部长怀进鹏赴广西调研基础教育工作，深入国门学校、乡镇中小学幼儿园、乡村教学点、特殊教育学校、专门学校，了解落实立德树人根本任务、铸牢中华民族共同体意识教育、实施教育数字化战略、推进健康学校建设等情况。\n\n在凭祥市，怀进鹏深入卡凤小学、卡凤幼儿园、凭祥镇中心小学柳班教学点、凭祥市民族希望实验学校，观摩师生应用国家中小学智慧教育平台开展铸牢中华民族共同体意识教育，了解学校日常教学管理、教师队伍建设、人工智能赋能教师教学能力提升应用、国防教育等情况。他强调，要落实立德树人根本任务，坚持不懈用习近平新时代中国特色社会主义思想铸魂育人，将新时代伟大变革成功案例融入课程，坚定不移把铸牢中华民族共同体意识贯穿教育全过程、各方面，扎实推进“五育并举”，落实健康第一教育理念，通过丰富活动深化国防教育，厚植学生家国情怀。\n\n对于边境地区基础教育，调研中提出要予以更多重视和关心支持，锚定高质量发展目标，优化边境地区学校师资配置和办学条件，加强国门学校建设，深入实施教育数字化战略，推动“硬设施”更新和“软环境”营造，加大师生人工智能素养培养，探索人工智能赋能教育教学模式创新，有效带动民族地区、边远山区教育优质均衡发展。同时，要高度重视校园食品安全，加强校园餐全链条监管，提升校园餐质量，确保孩子们吃得更安全、更营养、更可口。\n\n在凭祥市东南亚外语学校调研时，怀进鹏与越南留学生等师生代表交流，了解学习生活、职业生涯规划及服务自贸区发展等情况，勉励同学们勤奋学习、增强本领，为促进两国友好交流、民心相通作出贡献。他指出，要深化对外交流合作，创新“中文+技能”“专业+文化”的国际化办学模式和人才培养模式，精准对接“一带一路”东盟国家个性化人才培养需求，打造中国—东盟青少年学生交流品牌。\n\n在南宁市，怀进鹏深入南宁特殊教育学校、南宁市励志专门学校，了解教学管理情况，观摩特色课程，与师生交流学习生活情况。他强调，要切实保障残疾儿童少年平等接受教育的权利，加快健全特殊教育体系，增强普惠保障能力，健全关爱服务体系和工作机制，努力促进特殊儿童青少年学有所教、弱有所扶；同时要指导专门学校加强规范管理，把握学生特点，强化家校协同，提升矫治成效。',
    category: '基础教育',
    date: '2026-04-15',
    source: '教育部',
    cardType: 'official',
    hotness: 88,
    verifiedSourceUrl: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202604/t20260415_1433810.html',
    references: [
      { label: '教育部原文', url: 'https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/moe_1485/202604/t20260415_1433810.html' },
      { label: '中国教育信息化网转载', url: 'https://web.ict.edu.cn/?innovation=21711' },
      { label: '新浪财经转载', url: 'http://finance.sina.com.cn/wm/2026-04-15/doc-inhuqwst8268265.shtml' }
    ]
  }
];

const STRUCTURED_DEFAULT_NEWS_LIST = DEFAULT_NEWS_LIST.map(ensureStructuredCard);

const sanitizeSavedNews = (savedItems = [], availableNews = []) => {
  const availableMap = new Map(availableNews.map((item) => [item.id, item]));

  return savedItems
    .filter((item) => item && availableMap.has(item.id))
    .map((item) => availableMap.get(item.id));
};

function App() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newsList, setNewsList] = useState(STRUCTURED_DEFAULT_NEWS_LIST);
  const [savedNews, setSavedNews] = useState([]);
  const [homeListMode, setHomeListMode] = useState('all');
  const [notes, setNotes] = useState({});
  const [contentMarks, setContentMarks] = useState({});
  const [questions, setQuestions] = useState({});
  const [questionStats, setQuestionStats] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 从localStorage加载数据
  useEffect(() => {
    const storedAppState = localStorage.getItem(APP_STORAGE_KEY);
    if (storedAppState) {
      try {
        const parsedState = JSON.parse(storedAppState);
        setNotes(parsedState.notes && typeof parsedState.notes === 'object' ? parsedState.notes : {});
        setContentMarks(parsedState.contentMarks && typeof parsedState.contentMarks === 'object' ? parsedState.contentMarks : {});
        setQuestions(normalizeQuestionBank(parsedState.questions));
        setQuestionStats(parsedState.questionStats && typeof parsedState.questionStats === 'object' ? parsedState.questionStats : {});

        const customCards = dedupeCustomCards(Array.isArray(parsedState.customCards) ? parsedState.customCards : []);
        const mergedNewsList = mergeCustomCards(STRUCTURED_DEFAULT_NEWS_LIST, customCards);
        setNewsList(mergedNewsList);
        setSavedNews(sanitizeSavedNews(Array.isArray(parsedState.savedNews) ? parsedState.savedNews : [], mergedNewsList));

        setIsDataLoaded(true);
        return;
      } catch (error) {
        console.error('解析应用状态失败:', error);
      }
    }

    let parsedSavedNews = [];

    // 加载收藏数据
    const savedNewsData = localStorage.getItem('savedNews');
    if (savedNewsData) {
      try {
        parsedSavedNews = JSON.parse(savedNewsData);
      } catch (error) {
        console.error('解析收藏数据失败:', error);
        localStorage.setItem('savedNews', JSON.stringify([]));
        parsedSavedNews = [];
      }
    }
    
    // 加载自定义卡片
    let parsedCards = [];
    const customCards = localStorage.getItem('customCards');
    if (customCards) {
      try {
        parsedCards = dedupeCustomCards(JSON.parse(customCards));
      } catch (error) {
        console.error('解析自定义卡片数据失败:', error);
      }
    }

    const mergedNewsList = mergeCustomCards(STRUCTURED_DEFAULT_NEWS_LIST, parsedCards);
    setNewsList(mergedNewsList);
    setSavedNews(sanitizeSavedNews(Array.isArray(parsedSavedNews) ? parsedSavedNews : [], mergedNewsList));
    
    // 加载笔记
    const notes = localStorage.getItem('notes');
    if (notes) {
      try {
        setNotes(JSON.parse(notes));
      } catch (error) {
        console.error('解析笔记数据失败:', error);
      }
    }

    const storedContentMarks = localStorage.getItem('contentMarks');
    if (storedContentMarks) {
      try {
        setContentMarks(JSON.parse(storedContentMarks));
      } catch (error) {
        console.error('解析正文标注数据失败:', error);
      }
    }
    
    // 加载题目
    const questions = localStorage.getItem('questions');
    if (questions) {
      try {
        setQuestions(normalizeQuestionBank(JSON.parse(questions)));
      } catch (error) {
        console.error('解析题目数据失败:', error);
      }
    }

    // 加载做题统计
    const storedQuestionStats = localStorage.getItem('questionStats');
    if (storedQuestionStats) {
      try {
        setQuestionStats(JSON.parse(storedQuestionStats));
      } catch (error) {
        console.error('解析做题统计失败:', error);
      }
    }
    
    // 数据加载完成后设置标志
    setIsDataLoaded(true);
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      const customCards = dedupeCustomCards(newsList.filter(news => news.source === '自定义'));
      const appState = {
        savedNews,
        customCards,
        notes,
        contentMarks,
        questions,
        questionStats
      };

      const saveTimer = window.setTimeout(() => {
        try {
          localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(appState));
        } catch (error) {
          console.error('保存应用状态失败:', error);
        }
      }, 180);

      return () => {
        window.clearTimeout(saveTimer);
      };
    }
  }, [savedNews, newsList, notes, contentMarks, questions, questionStats, isDataLoaded]);

  // 添加卡片功能
  const handleAddCard = (newCard) => {
    const cleanedSourceUrl = (newCard.sourceUrl || '').trim();
    const duplicateResult = findDuplicateCard(newsList, { ...newCard, sourceUrl: cleanedSourceUrl });
    if (duplicateResult) {
      return {
        ok: false,
        duplicateCard: duplicateResult.card,
        duplicateReason: duplicateResult.reason
      };
    }

    const newId = newsList.length > 0 ? Math.max(...newsList.map(news => news.id)) + 1 : 1;
    setNewsList((prev) => mergeCustomCards(prev, [{
      ...newCard,
      id: newId,
      source: '自定义',
      cardType: 'custom',
      hotness: 0,
      sourceUrl: cleanedSourceUrl,
      references: cleanedSourceUrl ? [{ label: '用户提供来源', url: cleanedSourceUrl }] : []
    }]));

    return { ok: true };
  };

  const handleUpdateCard = (cardId, updates) => {
    const existingCard = newsList.find((news) => news.id === cardId);
    if (!existingCard || existingCard.source !== '自定义') {
      return { ok: false };
    }

    const cleanedSourceUrl = (updates?.sourceUrl || '').trim();
    const duplicateResult = findDuplicateCard(newsList, { ...existingCard, ...updates, sourceUrl: cleanedSourceUrl }, cardId);
    if (duplicateResult) {
      return {
        ok: false,
        duplicateCard: duplicateResult.card,
        duplicateReason: duplicateResult.reason
      };
    }

    const nextCard = ensureStructuredCard({
      ...existingCard,
      ...updates,
      content: updates?.summary || updates?.content || existingCard.content,
      summary: updates?.summary || updates?.content || existingCard.summary,
      detailContent: updates?.detailContent || existingCard.detailContent,
      sourceUrl: cleanedSourceUrl,
      references: cleanedSourceUrl ? [{ label: '用户提供来源', url: cleanedSourceUrl }] : []
    });

    setNewsList((prev) => prev.map((item) => (item.id === cardId ? nextCard : item)));
    setSavedNews((prev) => prev.map((item) => (item.id === cardId ? nextCard : item)));

    return {
      ok: true,
      card: nextCard
    };
  };

  // 收藏功能
  const handleSaveNews = (newsId) => {
    const newsToSave = newsList.find(news => news.id === newsId);
    if (newsToSave) {
      const isSaved = savedNews.some(news => news.id === newsId);
      if (isSaved) {
        // 取消收藏
        setSavedNews(prev => prev.filter(news => news.id !== newsId));
      } else {
        // 添加收藏
        setSavedNews(prev => [...prev, newsToSave]);
      }
    }
  };

  // 取消收藏功能
  const handleRemoveSavedNews = (newsId) => {
    setSavedNews(prev => prev.filter(news => news.id !== newsId));
  };

  return (
    <HashRouter>
      <div style={{ minHeight: '100vh', background: '#F5F6F8', position: 'relative' }}>
        {/* 左侧时间线 */}
        <Timeline 
          newsList={newsList} 
          onAddCard={handleAddCard}
          savedNews={savedNews}
          onSaveNews={handleSaveNews}
          onRemoveSavedNews={handleRemoveSavedNews}
          onChangeHomeListMode={setHomeListMode}
          isMobile={isMobile}
        />
        
        {/* 主内容区 */}
        <div style={{
          padding: isMobile ? '88px 12px 24px' : '20px',
          maxWidth: isMobile ? '100%' : '1200px',
          margin: isMobile ? '0 auto' : '0 0 0 70px',
          minHeight: '100vh'
        }}>
          {/* 搜索栏 */}
          <div style={{
            position: 'sticky',
            top: isMobile ? '72px' : '0',
            zIndex: 90,
            padding: isMobile ? '8px 0 10px' : '0 0 10px',
            background: 'transparent',
            boxShadow: 'none'
          }}>
            <SearchBar onSearch={setSearchTerm} />
            {homeListMode !== 'all' && (
              <div style={{ marginTop: '6px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: isMobile ? '12px 14px' : '14px 16px',
                  borderRadius: '16px',
                  background: homeListMode === 'saved' ? '#fff7ed' : '#faf5ff',
                  border: homeListMode === 'saved' ? '1px solid #fed7aa' : '1px solid #e9d5ff',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: homeListMode === 'saved' ? '#9a3412' : '#6b21a8',
                    fontWeight: 700
                  }}>
                    当前显示：{homeListMode === 'saved' ? '我的收藏' : '自定义列表'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setHomeListMode('all')}
                    style={{
                      border: 'none',
                      background: '#ffffff',
                      color: '#475569',
                      borderRadius: '999px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    返回全部卡片
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 路由内容 */}
          <main style={{ padding: isMobile ? '0 0 16px' : '0 16px 16px' }}>
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
                    newsList={newsList}
                    homeListMode={homeListMode}
                    onChangeHomeListMode={setHomeListMode}
                    savedNews={savedNews}
                    searchTerm={searchTerm}
                    onSaveNews={handleSaveNews}
                    onUpdateCard={handleUpdateCard}
                    notes={notes}
                    setNotes={setNotes}
                    contentMarks={contentMarks}
                    setContentMarks={setContentMarks}
                    questions={questions}
                    setQuestions={setQuestions}
                    questionStats={questionStats}
                    setQuestionStats={setQuestionStats}
                    isMobile={isMobile}
                  />
                }
              />
              <Route
                path="/news/:id"
                element={
                  <HomePage
                    newsList={newsList}
                    homeListMode={homeListMode}
                    onChangeHomeListMode={setHomeListMode}
                    savedNews={savedNews}
                    searchTerm={searchTerm}
                    onSaveNews={handleSaveNews}
                    onUpdateCard={handleUpdateCard}
                    notes={notes}
                    setNotes={setNotes}
                    contentMarks={contentMarks}
                    setContentMarks={setContentMarks}
                    questions={questions}
                    setQuestions={setQuestions}
                    questionStats={questionStats}
                    setQuestionStats={setQuestionStats}
                    isMobile={isMobile}
                  />
                }
              />
            </Routes>
          </main>


        </div>
      </div>
    </HashRouter>
  );
}

export default App;
