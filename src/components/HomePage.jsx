import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  appendQuestionsToEntry,
  getQuestionStatsKey,
  getSortedQuestions,
  moveQuestionBefore,
  normalizeQuestionEntry,
  parseQuestionsFromText,
  removeQuestionFromEntry,
  updateQuestionInEntry
} from '../lib/questionUtils';
import { askDoubao, buildLocalAnswer, hasDoubaoConfig } from '../lib/doubao';
import { importCardFromUrl, normalizeUrl } from '../lib/cardImport';
import { findDuplicateCard, formatDuplicateMessage } from '../lib/cardDuplicate';
import QuestionPracticeHeader from './QuestionPracticeHeader';
import QuestionEditorPanel from './QuestionEditorPanel';
import QuestionSortManagerModal from './QuestionSortManagerModal';
import QuestionListSection from './QuestionListSection';
import NoteSection from './NoteSection';
import RightFloatingActions from './RightFloatingActions';
import LeftFloatingActions from './LeftFloatingActions';

const EMPTY_ENTRY = { sortMode: 'desc', items: [] };

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const getSourceUrl = (sourceUrl) => {
  if (!sourceUrl) {
    return '';
  }

  const normalized = sourceUrl.trim().replace(/^http:\/\//i, 'https://');

  try {
    new URL(normalized);
    return normalized;
  } catch {
    return '';
  }
};

const getReferenceList = (news) => {
  if (!Array.isArray(news?.references)) {
    return [];
  }

  return news.references
    .map((item, index) => {
      const url = getSourceUrl(item?.url || '');
      if (!url) {
        return null;
      }

      return {
        id: `${news.id || 'ref'}_${index}`,
        label: String(item?.label || `来源 ${index + 1}`),
        url
      };
    })
    .filter(Boolean);
};

const buildSourceMeta = (news) => {
  if (!news) {
    return {
      url: '',
      label: '暂无原文',
      title: '当前没有可用原文链接',
      isDirect: false
    };
  }

  const references = getReferenceList(news);
  const directCandidate = news.verifiedSourceUrl || (
    news.source === '自定义' || news.sourceVerified === true
      ? news.sourceUrl
      : ''
  );
  const directUrl = getSourceUrl(directCandidate);

  if (directUrl) {
    return {
      url: directUrl,
      label: '原文链接',
      title: '打开已核验原文',
      isDirect: true
    };
  }

  if (references[0]) {
    return {
      url: references[0].url,
      label: '整理依据',
      title: `打开${references[0].label}`,
      isDirect: false
    };
  }

  return {
    url: '',
    label: '暂无来源',
    title: '当前没有可用来源链接',
    isDirect: false
  };
};

const hasVerifiedSource = (news) => Boolean(
  news && (
    news.cardType === 'official' ||
    news.verifiedSourceUrl ||
    news.source === '自定义' ||
    news.sourceVerified === true
  )
);

const getSourceDisplay = (news) => {
  if (!news) {
    return '';
  }

  if (news.source === '自定义') {
    return '自定义卡片';
  }

  if (news.cardType === 'summary') {
    return '整理摘要';
  }

  if (hasVerifiedSource(news)) {
    return news.source || '官方原文';
  }

  return '来源待补';
};

const buildCardPreview = (content) => {
  const cleaned = String(content || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (!cleaned) {
    return '暂无内容';
  }

  if (cleaned.length <= 96) {
    return cleaned;
  }

  return `${cleaned.slice(0, 96).trim()}...`;
};

const getSummaryContent = (news) => String(news?.summary || news?.content || '');

const chunkItems = (items = [], size = 2) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const buildDetailBody = (news) => {
  const cleaned = String(news?.detailContent || news?.content || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (!cleaned) {
    return ['暂无正文内容。'];
  }

  return cleaned.split('\n').map((paragraph) => paragraph.trim()).filter(Boolean);
};

const buildDetailHighlights = (paragraphs = []) => {
  const sentenceList = paragraphs
    .flatMap((paragraph) => String(paragraph || '').split(/(?<=[。！？])/))
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentenceList.length === 0) {
    return [];
  }

  const picked = [];
  const seen = new Set();
  const tryPush = (sentence) => {
    const normalized = sentence.replace(/\s+/g, '');
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    picked.push(sentence);
  };

  tryPush(sentenceList[0]);

  sentenceList.forEach((sentence) => {
    if (/(强调|指出|勉励|要落实|要深化|要切实|要高度重视|要指导|要予以更多重视)/.test(sentence)) {
      tryPush(sentence);
    }
  });

  return picked.slice(0, 5);
};

const getTextOffsetWithinElement = (element, targetNode, targetOffset) => {
  if (!element || !targetNode) {
    return 0;
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  let totalLength = 0;

  while (currentNode) {
    if (currentNode === targetNode) {
      return totalLength + targetOffset;
    }

    totalLength += currentNode.textContent?.length || 0;
    currentNode = walker.nextNode();
  }

  return totalLength;
};

const renderMarkedParagraph = (paragraph = '', marks = []) => {
  if (!marks.length) {
    return paragraph;
  }

  const nodes = [];
  let cursor = 0;

  marks
    .filter((mark) => Number.isFinite(mark.start) && Number.isFinite(mark.end) && mark.end > mark.start)
    .sort((first, second) => first.start - second.start)
    .forEach((mark, index) => {
      const safeStart = Math.max(cursor, Math.min(paragraph.length, mark.start));
      const safeEnd = Math.max(safeStart, Math.min(paragraph.length, mark.end));

      if (safeStart > cursor) {
        nodes.push(paragraph.slice(cursor, safeStart));
      }

      const markedText = paragraph.slice(safeStart, safeEnd);
      if (markedText) {
        const style = {
          fontWeight: mark.bold ? 700 : undefined,
          background: mark.highlightColor || undefined,
          color: mark.textColor || undefined,
          textDecoration: mark.underlineColor ? 'underline' : undefined,
          textDecorationColor: mark.underlineColor || undefined,
          textDecorationThickness: mark.underlineColor ? '2px' : undefined,
          textUnderlineOffset: mark.underlineColor ? '3px' : undefined,
          textDecorationSkipInk: mark.underlineColor ? 'none' : undefined,
          padding: mark.highlightColor && !mark.underlineColor ? '0 2px' : undefined,
          borderRadius: mark.highlightColor && !mark.underlineColor ? '4px' : undefined,
          boxDecorationBreak: mark.highlightColor && !mark.underlineColor ? 'clone' : undefined,
          WebkitBoxDecorationBreak: mark.highlightColor && !mark.underlineColor ? 'clone' : undefined
        };

        nodes.push(
          <span
            key={`${mark.id || `${safeStart}_${safeEnd}`}_${index}`}
            style={style}
          >
            {markedText}
          </span>
        );
      }

      cursor = safeEnd;
    });

  if (cursor < paragraph.length) {
    nodes.push(paragraph.slice(cursor));
  }

  return nodes;
};

const HIGHLIGHT_COLORS = ['#fff3a3', '#fde68a', '#bfdbfe', '#fecdd3', '#d9f99d'];
const UNDERLINE_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#ea580c'];
const TEXT_COLORS = ['#0f172a', '#1d4ed8', '#15803d', '#b91c1c', '#7c3aed'];
const TEXT_STYLE_PREFS_KEY = 'edu-policy-text-style-prefs-v1';

const cloneMarkWithRange = (mark, start, end) => ({
  ...mark,
  id: `${mark.paragraphIndex}_${start}_${end}`,
  start,
  end
});

const getMergedMarkStyleFromOverlap = (marks = [], paragraphIndex, start, end) => marks.reduce((accumulator, mark) => {
  if (
    mark.paragraphIndex !== paragraphIndex ||
    mark.end <= start ||
    mark.start >= end
  ) {
    return accumulator;
  }

  return {
    ...accumulator,
    bold: accumulator.bold || mark.bold || false,
    highlightColor: accumulator.highlightColor || mark.highlightColor || '',
    underlineColor: accumulator.underlineColor || mark.underlineColor || '',
    textColor: accumulator.textColor || mark.textColor || ''
  };
}, {
  bold: false,
  highlightColor: '',
  underlineColor: '',
  textColor: ''
});

const splitMarksAroundSelection = (marks = [], paragraphIndex, start, end) => {
  const preserved = [];

  marks.forEach((mark) => {
    if (
      mark.paragraphIndex !== paragraphIndex ||
      mark.end <= start ||
      mark.start >= end
    ) {
      preserved.push(mark);
      return;
    }

    if (mark.start < start) {
      preserved.push(cloneMarkWithRange(mark, mark.start, start));
    }

    if (mark.end > end) {
      preserved.push(cloneMarkWithRange(mark, end, mark.end));
    }
  });

  return preserved;
};

const buildPreviewHighlights = (news) => {
  const summary = getSummaryContent(news)
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (summary) {
    const normalizedSummary = summary.replace(/[。！？]+$/g, '');
    const focusMatch = normalizedSummary.match(/^(.*?)(?:，|、)?(重点关注|重点包括|重点了解|重点聚焦)(.+)$/);

    if (focusMatch) {
      const intro = focusMatch[1].trim().replace(/[，、]+$/g, '');
      const focusPrefix = focusMatch[2];
      const focusItems = focusMatch[3]
        .split(/[、，]/)
        .map((item) => item.trim())
        .filter(Boolean);
      const groupedFocusItems = chunkItems(focusItems, 2).slice(0, 2);
      const summaryPoints = [
        intro ? intro : '',
        ...groupedFocusItems.map((group, index) => `${index === 0 ? focusPrefix : '同时关注'}${group.join('、')}`)
      ].filter(Boolean).map((item, index) => `${index + 1}. ${item}`);

      if (summaryPoints.length > 0) {
        return summaryPoints.join('\n');
      }
    }

    const summarySentences = normalizedSummary
      .split(/[；。！？]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((item, index) => `${index + 1}. ${item}`);

    if (summarySentences.length > 0) {
      return summarySentences.join('\n');
    }
  }

  const detailHighlights = buildDetailHighlights(buildDetailBody(news))
    .slice(0, 3)
    .map((item) => item.replace(/[。！？]+$/, ''))
    .map((item, index) => `${index + 1}. ${item}`);

  if (detailHighlights.length > 0) {
    return detailHighlights.join('\n');
  }

  return buildCardPreview(news?.content || '');
};

const normalizeSearchValue = (value = '') => String(value || '').toLowerCase().replace(/\s+/g, '');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sanitizeRichTextHtml = (value = '') => String(value || '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/\son\w+="[^"]*"/gi, '')
  .replace(/\son\w+='[^']*'/gi, '')
  .replace(/javascript:/gi, '');

const normalizeRichText = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  if (/<(p|div|br|ul|ol|li|strong|b|em|span)\b/i.test(raw)) {
    return sanitizeRichTextHtml(raw);
  }

  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const htmlParts = [];
  let listType = '';

  const closeList = () => {
    if (listType === 'ul') {
      htmlParts.push('</ul>');
    }
    if (listType === 'ol') {
      htmlParts.push('</ol>');
    }
    listType = '';
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      return;
    }

    if (/^[-•·]\s+/.test(trimmed)) {
      if (listType !== 'ul') {
        closeList();
        htmlParts.push('<ul>');
        listType = 'ul';
      }
      htmlParts.push(`<li>${escapeHtml(trimmed.replace(/^[-•·]\s+/, ''))}</li>`);
      return;
    }

    if (/^\d+[\.、]\s+/.test(trimmed)) {
      if (listType !== 'ol') {
        closeList();
        htmlParts.push('<ol>');
        listType = 'ol';
      }
      htmlParts.push(`<li>${escapeHtml(trimmed.replace(/^\d+[\.、]\s+/, ''))}</li>`);
      return;
    }

    closeList();
    htmlParts.push(`<p>${escapeHtml(trimmed).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`);
  });

  closeList();
  return sanitizeRichTextHtml(htmlParts.join(''));
};

const formatTextSelection = (value, selectionStart, selectionEnd, mode) => {
  const source = String(value || '');
  const start = Number.isFinite(selectionStart) ? selectionStart : source.length;
  const end = Number.isFinite(selectionEnd) ? selectionEnd : start;
  const selectedText = source.slice(start, end);
  const before = source.slice(0, start);
  const after = source.slice(end);

  if (mode === 'bold') {
    const innerText = selectedText || '加粗内容';
    return {
      text: `${before}**${innerText}**${after}`,
      selectionStart: start + 2,
      selectionEnd: start + 2 + innerText.length
    };
  }

  if (mode === 'bulletList' || mode === 'orderedList') {
    const rawText = selectedText || '列表项';
    const normalizedLines = rawText.split('\n');
    const nextLines = normalizedLines.map((line, index) => {
      const cleanedLine = line.trim().replace(/^([-*•]\s+|\d+[\.、]\s+)/, '') || '列表项';
      return mode === 'orderedList' ? `${index + 1}. ${cleanedLine}` : `- ${cleanedLine}`;
    });
    const replacement = nextLines.join('\n');

    return {
      text: `${before}${replacement}${after}`,
      selectionStart: start,
      selectionEnd: start + replacement.length
    };
  }

  return {
    text: source,
    selectionStart: start,
    selectionEnd: end
  };
};

const getQuestionPerformance = (questionStats, newsId, questionId) => {
  const stats = questionStats[getQuestionStatsKey(newsId, questionId)] || { attempts: 0, correct: 0 };
  const attempts = Number(stats.attempts) || 0;
  const correct = Number(stats.correct) || 0;

  return {
    attempts,
    correct,
    accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0
  };
};

const getArticleStats = (questionStats, newsId, questionList) => {
  return questionList.reduce((summary, question) => {
    const currentStats = getQuestionPerformance(questionStats, newsId, question.id);

    return {
      questionCount: summary.questionCount + 1,
      attempts: summary.attempts + currentStats.attempts,
      correct: summary.correct + currentStats.correct
    };
  }, {
    questionCount: 0,
    attempts: 0,
    correct: 0
  });
};

const getPlainIconStyle = ({ active = false, disabled = false } = {}) => ({
  border: 'none',
  background: 'transparent',
  padding: 0,
  margin: 0,
  width: '24px',
  height: '24px',
  color: active ? '#f59e0b' : '#667085',
  fontSize: '22px',
  lineHeight: 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  boxShadow: 'none',
  outline: 'none',
  transition: 'transform 0.2s ease, color 0.2s ease, opacity 0.2s ease'
});

const buildQuestionEditorText = (question) => {
  if (question?.rawText) {
    return question.rawText;
  }

  if (!question) {
    return '';
  }

  const optionText = (question.options || [])
    .map((option) => `${option.letter}. ${option.text}`)
    .join('\n');

  return [
    question.title || '',
    optionText,
    question.answer ? `答案：${question.answer}` : '',
    question.explanation ? `解析：${question.explanation}` : ''
  ].filter(Boolean).join('\n');
};

const FloatingActionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 18px',
  borderRadius: '999px',
  border: '1px solid #d6dde8',
  background: '#ffffff',
  color: '#334155',
  cursor: 'pointer',
  fontSize: '14px',
  boxShadow: '0 12px 24px rgba(15,23,42,0.12)',
  textDecoration: 'none'
};

const StrokeIcon = ({ children, size = 18, color = '#334155', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: 'block', flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);

const BoldIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M8 6h5a3 3 0 0 1 0 6H8z" />
    <path d="M8 12h6a3 3 0 0 1 0 6H8z" />
  </StrokeIcon>
);

const BookmarkIcon = ({ filled = false, size = 18, color, style }) => (
  <StrokeIcon size={size} color={color} style={style}>
    <path d="M6 4h12v16l-6-4-6 4z" fill={filled ? color || '#334155' : 'none'} />
  </StrokeIcon>
);

const LinkIcon = ({ size = 18, color, style }) => (
  <StrokeIcon size={size} color={color} style={style}>
    <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.7 5.23" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07l1.41-1.41" />
  </StrokeIcon>
);

const SparkleIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
    <path d="M5 18l.8 2.2L8 21l-2.2.8L5 24l-.8-2.2L2 21l2.2-.8L5 18z" transform="translate(0 -2)" />
  </StrokeIcon>
);

const NoteIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M8 4h8l4 4v12H8z" />
    <path d="M16 4v4h4" />
    <path d="M10 12h6" />
    <path d="M10 16h4" />
  </StrokeIcon>
);

const PlusIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </StrokeIcon>
);

const EditIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </StrokeIcon>
);

const TrashIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M9 7V4h6v3" />
  </StrokeIcon>
);

const GripIcon = () => (
  <StrokeIcon>
    <path d="M9 7h6" />
    <path d="M9 12h6" />
    <path d="M9 17h6" />
  </StrokeIcon>
);

const RefreshIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M4 4v5h5" />
    <path d="M20 20v-5h-5" />
    <path d="M20 9a8 8 0 0 0-13.3-3L4 9" />
    <path d="M4 15a8 8 0 0 0 13.3 3L20 15" />
  </StrokeIcon>
);

const OrderedListIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M10 7h9" />
    <path d="M10 12h9" />
    <path d="M10 17h9" />
    <path d="M4 7h1" />
    <path d="M4 12h1" />
    <path d="M4 17h1" />
  </StrokeIcon>
);

const UnorderedListIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M9 7h10" />
    <path d="M9 12h10" />
    <path d="M9 17h10" />
    <path d="M5 7h.01" />
    <path d="M5 12h.01" />
    <path d="M5 17h.01" />
  </StrokeIcon>
);

const SortIcon = ({ size = 18, color }) => (
  <StrokeIcon size={size} color={color}>
    <path d="M8 6h8" />
    <path d="M8 12h5" />
    <path d="M8 18h2" />
    <path d="M17 6l2-2 2 2" />
    <path d="M19 4v16" />
  </StrokeIcon>
);

const LockIcon = ({ size = 16, color = '#475569' }) => (
  <StrokeIcon size={size} color={color}>
    <rect x="6" y="11" width="12" height="9" rx="2" />
    <path d="M9 11V8a3 3 0 0 1 6 0v3" />
  </StrokeIcon>
);

const UnlockIcon = ({ size = 16, color = '#94a3b8' }) => (
  <StrokeIcon size={size} color={color}>
    <rect x="6" y="11" width="12" height="9" rx="2" />
    <path d="M15 11V8a3 3 0 0 0-5.5-1.8" />
  </StrokeIcon>
);

const HomePage = ({
  newsList,
  homeListMode,
  onChangeHomeListMode,
  savedNews,
  searchTerm,
  onSaveNews,
  onUpdateCard,
  onDeleteCard,
  notes,
  setNotes,
  contentMarks,
  setContentMarks,
  questions,
  setQuestions,
  questionStats,
  setQuestionStats,
  isMobile
}) => {
  const [fullScreenNews, setFullScreenNews] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [isQuestionEditing, setIsQuestionEditing] = useState(false);
  const [isCardEditing, setIsCardEditing] = useState(false);
  const [isCardImporting, setIsCardImporting] = useState(false);
  const [isSortManagerOpen, setIsSortManagerOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [questionDraft, setQuestionDraft] = useState('');
  const [cardDraft, setCardDraft] = useState({ title: '', date: '', sourceUrl: '', summary: '', detailContent: '' });
  const [cardEditError, setCardEditError] = useState('');
  const [cardEditStatus, setCardEditStatus] = useState('');
  const [userAnswers, setUserAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [draggedQuestionId, setDraggedQuestionId] = useState('');
  const [dragOverQuestionId, setDragOverQuestionId] = useState('');
  const [sortDraftEntry, setSortDraftEntry] = useState(EMPTY_ENTRY);
  const [optionNoteEditor, setOptionNoteEditor] = useState({ questionId: '', optionLetter: '', text: '' });
  const [hoveredOptionKey, setHoveredOptionKey] = useState('');
  const [optionNotePreview, setOptionNotePreview] = useState({ questionId: '', optionLetter: '' });
  const [isMainListMenuOpen, setIsMainListMenuOpen] = useState(false);
  const [isOptionListMenuOpen, setIsOptionListMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [cardSourceMenuId, setCardSourceMenuId] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [textSelectionMenu, setTextSelectionMenu] = useState({
    visible: false,
    paragraphIndex: -1,
    start: 0,
    end: 0,
    x: 0,
    y: 0
  });
  const [selectedHighlightColor, setSelectedHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [selectedUnderlineColor, setSelectedUnderlineColor] = useState(UNDERLINE_COLORS[0]);
  const [selectedTextColor, setSelectedTextColor] = useState(TEXT_COLORS[0]);
  const [linkTextColorToBold, setLinkTextColorToBold] = useState(false);
  const [textStyleSettings, setTextStyleSettings] = useState('');
  const [styleConfigured, setStyleConfigured] = useState({
    highlight: false,
    underline: false,
    textColor: false
  });
  const questionTextareaRef = useRef(null);
  const cardEditorRef = useRef(null);
  const cardImportingRef = useRef(false);
  const noteEditorRef = useRef(null);
  const noteSectionRef = useRef(null);
  const optionNoteEditorRef = useRef(null);
  const noteCompositionRef = useRef(false);
  const optionNoteCompositionRef = useRef(false);
  const aiPopupRef = useRef(null);
  const aiButtonRef = useRef(null);
  const sourcePopupRef = useRef(null);
  const sourceButtonRef = useRef(null);
  const cardSourceCloseTimerRef = useRef(null);
  const cardRefs = useRef(new Map());
  const detailBodyRef = useRef(null);
  const textStylePressTimerRef = useRef(null);
  const textStyleLongPressRef = useRef('');
  const firstQuestionCardRef = useRef(null);
  const questionSectionRef = useRef(null);
  const isDoubaoReady = hasDoubaoConfig();
  const navigate = useNavigate();
  const { id: routeNewsId = '' } = useParams();

  useEffect(() => {
    try {
      const storedPrefs = localStorage.getItem(TEXT_STYLE_PREFS_KEY);
      if (!storedPrefs) {
        return;
      }

      const parsedPrefs = JSON.parse(storedPrefs);
      if (parsedPrefs.highlightColor) {
        setSelectedHighlightColor(parsedPrefs.highlightColor);
      }
      if (parsedPrefs.underlineColor) {
        setSelectedUnderlineColor(parsedPrefs.underlineColor);
      }
      if (parsedPrefs.textColor) {
        setSelectedTextColor(parsedPrefs.textColor);
      }
      if (typeof parsedPrefs.linkTextColorToBold === 'boolean') {
        setLinkTextColorToBold(parsedPrefs.linkTextColorToBold);
      }
      if (parsedPrefs.styleConfigured && typeof parsedPrefs.styleConfigured === 'object') {
        setStyleConfigured((prev) => ({
          ...prev,
          ...parsedPrefs.styleConfigured
        }));
      } else {
        setStyleConfigured({
          highlight: true,
          underline: true,
          textColor: true
        });
      }
    } catch (error) {
      console.error('加载正文样式偏好失败:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_STYLE_PREFS_KEY, JSON.stringify({
        highlightColor: selectedHighlightColor,
        underlineColor: selectedUnderlineColor,
        textColor: selectedTextColor,
        linkTextColorToBold,
        styleConfigured
      }));
    } catch (error) {
      console.error('保存正文样式偏好失败:', error);
    }
  }, [selectedHighlightColor, selectedUnderlineColor, selectedTextColor, linkTextColorToBold, styleConfigured]);

  const openFullScreenStateOnly = (news) => {
    window.dispatchEvent(new CustomEvent('newsOverlayChange', { detail: { isOpen: true } }));
    setFullScreenNews(news);
    setIsFullScreen(true);
    setIsNoteEditing(false);
    setIsQuestionEditing(false);
    setIsCardEditing(false);
    setIsSortManagerOpen(false);
    setEditingQuestionId('');
    setNoteContent(normalizeRichText(notes[news.id] || ''));
    setQuestionDraft('');
    setCardDraft({
      title: news.title || '',
      date: news.date || '',
      sourceUrl: news.sourceUrl || '',
      summary: news.summary || news.content || '',
      detailContent: news.detailContent || news.content || ''
    });
    setCardEditError('');
    setCardEditStatus('');
    setUserAnswers({});
    setSubmittedAnswers({});
    setDraggedQuestionId('');
    setDragOverQuestionId('');
    setSortDraftEntry(EMPTY_ENTRY);
    setOptionNotePreview({ questionId: '', optionLetter: '' });
    setIsMainListMenuOpen(false);
    setIsOptionListMenuOpen(false);
    setIsSortMenuOpen(false);
    setIsSourceMenuOpen(false);
    setCardSourceMenuId('');
    document.body.style.overflow = 'hidden';
  };

  const openFullScreen = (news, options = {}) => {
    const { updateRoute = true, replace = false } = options;

    if (!news) {
      return;
    }

    if (updateRoute) {
      navigate(`/news/${news.id}`, { replace });
      return;
    }

    openFullScreenStateOnly(news);
  };

  useEffect(() => {
    if (!routeNewsId) {
      if (isFullScreen) {
        closeFullScreenStateOnly();
      }
      return;
    }

    const targetNews = newsList.find((item) => String(item.id) === String(routeNewsId));

    if (!targetNews) {
      navigate('/', { replace: true });
      return;
    }

    if (!isFullScreen || fullScreenNews?.id !== targetNews.id) {
      openFullScreenStateOnly(targetNews);
    }
  }, [routeNewsId, newsList, navigate]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('newsOverlayChange', { detail: { isOpen: false } }));
      document.body.style.overflow = 'auto';
      if (cardSourceCloseTimerRef.current) {
        clearTimeout(cardSourceCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isCardEditing && cardEditorRef.current) {
      cardEditorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEditorRef.current.focus();
    }
  }, [isCardEditing]);

  useEffect(() => {
    if (isQuestionEditing && questionTextareaRef.current) {
      questionTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      questionTextareaRef.current.focus();
    }
  }, [isQuestionEditing]);

  useEffect(() => {
    if (isNoteEditing && noteEditorRef.current) {
      noteEditorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      noteEditorRef.current.focus();
    }
  }, [isNoteEditing]);

  useEffect(() => {
    if (optionNoteEditor.questionId && optionNoteEditorRef.current) {
      optionNoteEditorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      optionNoteEditorRef.current.focus();
    }
  }, [optionNoteEditor.questionId, optionNoteEditor.optionLetter]);

  useEffect(() => {
    if (!isAiOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (aiPopupRef.current?.contains(event.target) || aiButtonRef.current?.contains(event.target)) {
        return;
      }

      setIsAiOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isAiOpen]);

  useEffect(() => {
    if (!isSourceMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (sourcePopupRef.current?.contains(event.target) || sourceButtonRef.current?.contains(event.target)) {
        return;
      }

      setIsSourceMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isSourceMenuOpen]);

  useEffect(() => {
    if (!textSelectionMenu.visible) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (event.target.closest('[data-selection-toolbar="true"]')) {
        return;
      }

      setTextSelectionMenu((prev) => ({ ...prev, visible: false }));
      setTextStyleSettings('');
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [textSelectionMenu.visible]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const layer = event.target.closest('[data-popup-layer="true"]');
      if (!layer) {
        setOptionNotePreview({ questionId: '', optionLetter: '' });
        setIsMainListMenuOpen(false);
        setIsOptionListMenuOpen(false);
        setIsSortMenuOpen(false);
        setCardSourceMenuId('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const closeFullScreenStateOnly = () => {
    window.dispatchEvent(new CustomEvent('newsOverlayChange', { detail: { isOpen: false } }));
    if (cardSourceCloseTimerRef.current) {
      clearTimeout(cardSourceCloseTimerRef.current);
      cardSourceCloseTimerRef.current = null;
    }
    setIsFullScreen(false);
    setFullScreenNews(null);
    setIsNoteEditing(false);
    setIsQuestionEditing(false);
    setIsCardEditing(false);
    setIsSortManagerOpen(false);
    setEditingQuestionId('');
    setNoteContent('');
    setQuestionDraft('');
    setUserAnswers({});
    setSubmittedAnswers({});
    setDraggedQuestionId('');
    setDragOverQuestionId('');
    setSortDraftEntry(EMPTY_ENTRY);
    setHoveredOptionKey('');
    setOptionNotePreview({ questionId: '', optionLetter: '' });
    setTextSelectionMenu({ visible: false, paragraphIndex: -1, start: 0, end: 0, x: 0, y: 0 });
    setTextStyleSettings('');
    setIsMainListMenuOpen(false);
    setIsOptionListMenuOpen(false);
    setIsSortMenuOpen(false);
    setIsSourceMenuOpen(false);
    setCardSourceMenuId('');
    document.body.style.overflow = 'auto';
  };

  const closeFullScreen = () => {
    navigate('/');
  };

  const handleDetailTextSelection = () => {
    if (!fullScreenNews || isCardEditing) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setTextSelectionMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    const paragraphElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement?.closest('[data-detail-paragraph]')
      : range.commonAncestorContainer.closest?.('[data-detail-paragraph]');

    if (!paragraphElement || !detailBodyRef.current?.contains(paragraphElement)) {
      setTextSelectionMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const paragraphIndex = Number(paragraphElement.dataset.paragraphIndex);
    if (!Number.isFinite(paragraphIndex)) {
      setTextSelectionMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const start = getTextOffsetWithinElement(paragraphElement, range.startContainer, range.startOffset);
    const end = getTextOffsetWithinElement(paragraphElement, range.endContainer, range.endOffset);
    const safeStart = Math.min(start, end);
    const safeEnd = Math.max(start, end);

    if (safeEnd - safeStart <= 0) {
      setTextSelectionMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const rect = range.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 0;
    const clampedX = viewportWidth
      ? Math.min(Math.max(rect.left + rect.width / 2, 170), viewportWidth - 170)
      : rect.left + rect.width / 2;
    setTextSelectionMenu({
      visible: true,
      paragraphIndex,
      start: safeStart,
      end: safeEnd,
      x: clampedX,
      y: rect.top - 12
    });
    setTextStyleSettings('');
  };

  const applyTextMark = (type, color = '') => {
    if (!fullScreenNews || textSelectionMenu.paragraphIndex < 0 || !setContentMarks) {
      return;
    }

    const { paragraphIndex, start, end } = textSelectionMenu;

    setContentMarks((prev) => {
      const currentMarks = Array.isArray(prev?.[fullScreenNews.id]) ? prev[fullScreenNews.id] : [];
      const nextMarks = splitMarksAroundSelection(currentMarks, paragraphIndex, start, end);

      const mergedMark = {
        ...getMergedMarkStyleFromOverlap(currentMarks, paragraphIndex, start, end),
        id: `${paragraphIndex}_${start}_${end}`,
        paragraphIndex,
        start,
        end
      };

      if (type === 'bold') {
        mergedMark.bold = true;
      }

      if (type === 'highlight') {
        mergedMark.highlightColor = color;
      }

      if (type === 'underline') {
        mergedMark.underlineColor = color;
      }

      if (type === 'textColor') {
        mergedMark.textColor = color;
        if (linkTextColorToBold) {
          mergedMark.bold = true;
        }
      }

      nextMarks.push(mergedMark);

      return {
        ...prev,
        [fullScreenNews.id]: nextMarks
      };
    });

    window.getSelection()?.removeAllRanges();
    setTextSelectionMenu({ visible: false, paragraphIndex: -1, start: 0, end: 0, x: 0, y: 0 });
    setTextStyleSettings('');
  };

  const clearTextMark = () => {
    if (!fullScreenNews || textSelectionMenu.paragraphIndex < 0 || !setContentMarks) {
      return;
    }

    const { paragraphIndex, start, end } = textSelectionMenu;

    setContentMarks((prev) => {
      const currentMarks = Array.isArray(prev?.[fullScreenNews.id]) ? prev[fullScreenNews.id] : [];
      const nextMarks = splitMarksAroundSelection(currentMarks, paragraphIndex, start, end);

      return {
        ...prev,
        [fullScreenNews.id]: nextMarks
      };
    });

    window.getSelection()?.removeAllRanges();
    setTextSelectionMenu({ visible: false, paragraphIndex: -1, start: 0, end: 0, x: 0, y: 0 });
    setTextStyleSettings('');
  };

  const startTextStyleLongPress = (type) => {
    if (textStylePressTimerRef.current) {
      clearTimeout(textStylePressTimerRef.current);
    }

    textStyleLongPressRef.current = '';
    textStylePressTimerRef.current = setTimeout(() => {
      textStyleLongPressRef.current = type;
      setTextStyleSettings(type);
    }, 420);
  };

  const stopTextStyleLongPress = () => {
    if (textStylePressTimerRef.current) {
      clearTimeout(textStylePressTimerRef.current);
      textStylePressTimerRef.current = null;
    }
  };

  const handleStyleButtonClick = (type) => {
    if (textStyleLongPressRef.current === type) {
      textStyleLongPressRef.current = '';
      return;
    }

    if (!styleConfigured[type]) {
      setTextStyleSettings(type);
      return;
    }

    if (type === 'highlight') {
      applyTextMark('highlight', selectedHighlightColor);
      return;
    }

    if (type === 'underline') {
      applyTextMark('underline', selectedUnderlineColor);
      return;
    }

    if (type === 'textColor') {
      applyTextMark('textColor', selectedTextColor);
    }
  };

  const handleOpenCardEditor = () => {
    if (!fullScreenNews || fullScreenNews.source !== '自定义') {
      return;
    }

    setIsNoteEditing(false);
    setIsQuestionEditing(false);
    setIsSortManagerOpen(false);
    setCardDraft({
      title: fullScreenNews.title || '',
      date: fullScreenNews.date || '',
      sourceUrl: fullScreenNews.sourceUrl || '',
      summary: fullScreenNews.summary || fullScreenNews.content || '',
      detailContent: fullScreenNews.detailContent || fullScreenNews.content || ''
    });
    setCardEditError('');
    setCardEditStatus('');
    setIsCardEditing(true);
  };

  const handleImportCardEdit = async (force = false) => {
    if (!fullScreenNews || fullScreenNews.source !== '自定义' || cardImportingRef.current) {
      return;
    }

    const normalizedUrl = normalizeUrl(cardDraft.sourceUrl);
    if (!normalizedUrl) {
      setCardEditError('请输入可用链接');
      setCardEditStatus('');
      return;
    }

    const duplicateByUrl = findDuplicateCard(newsList, { sourceUrl: normalizedUrl }, fullScreenNews.id);
    if (duplicateByUrl) {
      setCardEditError(formatDuplicateMessage(duplicateByUrl));
      setCardEditStatus('');
      return;
    }

    const currentNormalized = normalizeUrl(fullScreenNews.sourceUrl || '');
    if (!force && normalizedUrl === currentNormalized) {
      return;
    }

    cardImportingRef.current = true;
    setIsCardImporting(true);
    setCardEditError('');
    setCardEditStatus('正在重新抓取原文...');

    try {
      const importedCard = await importCardFromUrl(normalizedUrl);
      const duplicateResult = findDuplicateCard(newsList, importedCard, fullScreenNews.id);
      if (duplicateResult) {
        setCardEditError(formatDuplicateMessage(duplicateResult));
        setCardEditStatus('');
        return;
      }

      setCardDraft((prev) => ({
        ...prev,
        sourceUrl: importedCard.sourceUrl || prev.sourceUrl,
        title: importedCard.title || prev.title,
        date: importedCard.date || prev.date,
        summary: importedCard.summary || prev.summary,
        detailContent: importedCard.detailContent || prev.detailContent
      }));
      setCardEditStatus('已重新抓取并识别，可继续修改后保存');
    } catch (error) {
      console.error('重新抓取自定义卡片失败:', error);
      setCardEditError(error.message || '重新抓取失败');
      setCardEditStatus('');
    } finally {
      cardImportingRef.current = false;
      setIsCardImporting(false);
    }
  };

  const handleSaveCardEdit = () => {
    if (!fullScreenNews || fullScreenNews.source !== '自定义' || !onUpdateCard) {
      return;
    }

    const result = onUpdateCard(fullScreenNews.id, {
      title: cardDraft.title.trim(),
      date: cardDraft.date,
      sourceUrl: cardDraft.sourceUrl.trim(),
      summary: cardDraft.summary.trim(),
      content: cardDraft.summary.trim(),
      detailContent: cardDraft.detailContent.trim()
    });

    if (result?.ok === false && result.duplicateCard) {
      setCardEditError(`该链接已存在：${result.duplicateCard.title}`);
      return;
    }

    if (result?.ok && result.card) {
      setFullScreenNews(result.card);
      setCardDraft({
        title: result.card.title || '',
        date: result.card.date || '',
        sourceUrl: result.card.sourceUrl || '',
        summary: result.card.summary || result.card.content || '',
        detailContent: result.card.detailContent || result.card.content || ''
      });
      setCardEditError('');
      setCardEditStatus('');
      setIsCardEditing(false);
    }
  };

  const handleDeleteCustomCard = () => {
    if (!fullScreenNews || fullScreenNews.source !== '自定义' || !onDeleteCard) {
      return;
    }

    const confirmed = window.confirm(`确定删除自定义卡片《${fullScreenNews.title}》吗？`);
    if (!confirmed) {
      return;
    }

    const result = onDeleteCard(fullScreenNews.id);
    if (result?.ok === false) {
      return;
    }

    closeFullScreen();
  };

  const baseNewsList = useMemo(() => {
    if (homeListMode === 'saved') {
      return savedNews;
    }

    if (homeListMode === 'custom') {
      return newsList.filter((news) => news.source === '自定义');
    }

    return newsList;
  }, [homeListMode, newsList, savedNews]);

  const filteredNews = useMemo(() => {
    const keyword = normalizeSearchValue(searchTerm);
    const matchedNews = keyword
      ? baseNewsList.filter((news) => (
        normalizeSearchValue([
          news.title,
          news.summary,
          news.content,
          news.detailContent,
          news.category,
          news.source,
          ...(Array.isArray(news.references) ? news.references.map((item) => `${item?.label || ''} ${item?.url || ''}`) : [])
        ].join(' ')).includes(keyword)
      ))
      : baseNewsList;

    return [...matchedNews].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [baseNewsList, searchTerm]);

  const currentQuestionEntry = useMemo(() => {
    if (!fullScreenNews) {
      return EMPTY_ENTRY;
    }

    return normalizeQuestionEntry(questions[fullScreenNews.id]);
  }, [fullScreenNews, questions]);

  const currentQuestions = useMemo(() => getSortedQuestions(currentQuestionEntry), [currentQuestionEntry]);
  const detailParagraphs = useMemo(() => (
    fullScreenNews ? buildDetailBody(fullScreenNews) : []
  ), [fullScreenNews]);
  const currentContentMarks = useMemo(() => (
    fullScreenNews && contentMarks && Array.isArray(contentMarks[fullScreenNews.id])
      ? contentMarks[fullScreenNews.id]
      : []
  ), [contentMarks, fullScreenNews]);
  const currentArticleStats = useMemo(() => {
    if (!fullScreenNews) {
      return { questionCount: 0, attempts: 0, correct: 0 };
    }

    return getArticleStats(questionStats, fullScreenNews.id, currentQuestions);
  }, [currentQuestions, fullScreenNews, questionStats]);

  const isSaved = (newsId) => savedNews.some((news) => news.id === newsId);
  const hasNote = Boolean(fullScreenNews && notes[fullScreenNews.id]);
  const fullScreenReferences = getReferenceList(fullScreenNews);

  const openReferenceAction = (references = [], options = {}) => {
    const { menuId = '', closeAi = false } = options;
    if (!references.length) {
      return;
    }

    if (references.length === 1) {
      if (closeAi) {
        setIsAiOpen(false);
      }
      setIsSourceMenuOpen(false);
      setCardSourceMenuId('');
      window.open(references[0].url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (closeAi) {
      setIsAiOpen(false);
    }

    if (menuId) {
      setCardSourceMenuId((prev) => (prev === menuId ? '' : menuId));
      return;
    }

    setIsSourceMenuOpen((prev) => !prev);
  };

  const setQuestionEntry = (newsId, updater) => {
    setQuestions((prev) => {
      const currentEntry = normalizeQuestionEntry(prev[newsId]);
      const nextEntry = typeof updater === 'function' ? updater(currentEntry) : updater;

      return {
        ...prev,
        [newsId]: normalizeQuestionEntry(nextEntry)
      };
    });
  };

  const handleSaveNote = () => {
    if (!fullScreenNews) {
      return;
    }

    const nextNoteContent = sanitizeRichTextHtml(noteEditorRef.current?.innerHTML || noteContent);
    setNoteContent(nextNoteContent);

    setNotes((prev) => ({
      ...prev,
      [fullScreenNews.id]: nextNoteContent
    }));
    setIsNoteEditing(false);
  };

  const handleAutoSaveNote = () => {
    if (!isNoteEditing || !fullScreenNews) {
      return;
    }

    const nextNoteContent = sanitizeRichTextHtml(noteEditorRef.current?.innerHTML || noteContent);
    setNoteContent(nextNoteContent);

    setNotes((prev) => ({
      ...prev,
      [fullScreenNews.id]: nextNoteContent
    }));
    setIsNoteEditing(false);
  };

  const handleCancelNote = () => {
    if (fullScreenNews) {
      setNoteContent(normalizeRichText(notes[fullScreenNews.id] || ''));
    }
    setIsNoteEditing(false);
  };

  const handleDeleteNote = () => {
    if (!fullScreenNews) {
      return;
    }

    setNotes((prev) => {
      const nextNotes = { ...prev };
      delete nextNotes[fullScreenNews.id];
      return nextNotes;
    });
    setNoteContent('');
    setIsNoteEditing(false);
  };

  const handleOpenQuestionEditor = (question) => {
    setIsSortManagerOpen(false);
    setIsNoteEditing(false);
    setIsQuestionEditing(true);
    setEditingQuestionId(question?.id || '');
    setQuestionDraft(buildQuestionEditorText(question));
  };

  const handleSaveQuestions = () => {
    if (!fullScreenNews) {
      return;
    }

    if (editingQuestionId) {
      const parsedQuestions = parseQuestionsFromText(questionDraft);
      if (parsedQuestions.length === 0) {
        window.alert('没有识别到有效题目，请检查题干、选项、答案和解析格式。');
        return;
      }

      const parsedQuestion = parsedQuestions[0];
      setQuestionEntry(fullScreenNews.id, (entry) => updateQuestionInEntry(entry, {
        id: editingQuestionId,
        ...parsedQuestion,
        rawText: questionDraft.trim()
      }));
      setEditingQuestionId('');
      setQuestionDraft('');
      setIsQuestionEditing(false);
      return;
    }

    const appendedEntry = appendQuestionsToEntry(questions[fullScreenNews.id], questionDraft);
    if (appendedEntry.items.length === currentQuestionEntry.items.length) {
      window.alert('没有识别到有效题目，请检查题干、选项、答案和解析格式。');
      return;
    }

    setQuestionEntry(fullScreenNews.id, appendedEntry);
    setQuestionDraft('');
    setIsQuestionEditing(false);
  };

  const handleCancelQuestionEditor = () => {
    setQuestionDraft('');
    setEditingQuestionId('');
    setIsQuestionEditing(false);
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) {
      return;
    }

    const currentQuery = aiQuery.trim();
    const nextUserMessage = { role: 'user', content: currentQuery };
    setAiMessages((prev) => [...prev, nextUserMessage]);
    setIsAiLoading(true);

    try {
      const aiResponse = await askDoubao({
        query: currentQuery,
        history: aiMessages,
        newsList,
        currentNews: fullScreenNews
      });

      setAiMessages((prev) => [...prev, {
        role: 'assistant',
        content: aiResponse
      }]);
    } catch (error) {
      const fallbackResponse = error.code === 'MISSING_DOUBAO_CONFIG'
        ? buildLocalAnswer({ query: currentQuery, newsList, currentNews: fullScreenNews })
        : `AI 调用失败：${error.message}`;

      setAiMessages((prev) => [...prev, {
        role: 'assistant',
        content: fallbackResponse
      }]);
    } finally {
      setIsAiLoading(false);
      setAiQuery('');
    }
  };

  const openOptionNoteEditor = (question, optionLetter) => {
    const existingNote = normalizeRichText(String(question.optionNotes?.[optionLetter] || ''));
    setOptionNoteEditor({
      questionId: question.id,
      optionLetter,
      text: existingNote
    });
    setOptionNotePreview({ questionId: '', optionLetter: '' });
    setIsOptionListMenuOpen(false);
  };

  const closeOptionNoteEditor = () => {
    setOptionNoteEditor({ questionId: '', optionLetter: '', text: '' });
    setIsOptionListMenuOpen(false);
  };

  const syncEditorHtml = (editorType) => {
    if (editorType === 'main') {
      if (noteCompositionRef.current) {
        return;
      }
      setNoteContent(sanitizeRichTextHtml(noteEditorRef.current?.innerHTML || ''));
      return;
    }

    if (optionNoteCompositionRef.current) {
      return;
    }

    setOptionNoteEditor((prev) => ({
      ...prev,
      text: sanitizeRichTextHtml(optionNoteEditorRef.current?.innerHTML || '')
    }));
  };

  const handleEditorCompositionStart = (editorType) => {
    if (editorType === 'main') {
      noteCompositionRef.current = true;
      return;
    }

    optionNoteCompositionRef.current = true;
  };

  const handleEditorCompositionEnd = (editorType) => {
    if (editorType === 'main') {
      noteCompositionRef.current = false;
      setNoteContent(sanitizeRichTextHtml(noteEditorRef.current?.innerHTML || ''));
      return;
    }

    optionNoteCompositionRef.current = false;
    setOptionNoteEditor((prev) => ({
      ...prev,
      text: sanitizeRichTextHtml(optionNoteEditorRef.current?.innerHTML || '')
    }));
  };

  const applyRichTextCommand = (editorType, command) => {
    const editorRef = editorType === 'main' ? noteEditorRef : optionNoteEditorRef;
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncEditorHtml(editorType);
  };

  const handleSaveOptionNote = () => {
    if (!fullScreenNews || !optionNoteEditor.questionId || !optionNoteEditor.optionLetter) {
      return;
    }

    setQuestionEntry(fullScreenNews.id, (entry) => updateQuestionInEntry(entry, {
      id: optionNoteEditor.questionId,
      optionNotes: {
        ...(entry.items.find((item) => item.id === optionNoteEditor.questionId)?.optionNotes || {}),
        [optionNoteEditor.optionLetter]: sanitizeRichTextHtml(
          optionNoteEditorRef.current?.innerHTML || optionNoteEditor.text
        )
      }
    }));
    closeOptionNoteEditor();
  };

  const handleDeleteOptionNote = () => {
    if (!fullScreenNews || !optionNoteEditor.questionId || !optionNoteEditor.optionLetter) {
      return;
    }

    setQuestionEntry(fullScreenNews.id, (entry) => {
      const currentQuestion = entry.items.find((item) => item.id === optionNoteEditor.questionId);
      if (!currentQuestion) {
        return entry;
      }

      const nextOptionNotes = { ...(currentQuestion.optionNotes || {}) };
      delete nextOptionNotes[optionNoteEditor.optionLetter];

      return updateQuestionInEntry(entry, {
        id: optionNoteEditor.questionId,
        optionNotes: nextOptionNotes
      });
    });
    closeOptionNoteEditor();
  };

  const handleQuestionChoice = (question, optionLetter) => {
    if (!fullScreenNews) {
      return;
    }

    const statsKey = getQuestionStatsKey(fullScreenNews.id, question.id);
    if (submittedAnswers[statsKey]) {
      return;
    }

    setUserAnswers((prev) => ({
      ...prev,
      [statsKey]: optionLetter
    }));
    setSubmittedAnswers((prev) => ({
      ...prev,
      [statsKey]: true
    }));
    setQuestionStats((prev) => {
      const previousStats = prev[statsKey] || { attempts: 0, correct: 0 };
      const isCorrect = question.answer ? optionLetter === question.answer : false;

      return {
        ...prev,
        [statsKey]: {
          attempts: (Number(previousStats.attempts) || 0) + 1,
          correct: (Number(previousStats.correct) || 0) + (isCorrect ? 1 : 0)
        }
      };
    });
  };

  const handleRetryQuestion = (question) => {
    if (!fullScreenNews) {
      return;
    }

    const statsKey = getQuestionStatsKey(fullScreenNews.id, question.id);
    setSubmittedAnswers((prev) => ({
      ...prev,
      [statsKey]: false
    }));
    setUserAnswers((prev) => ({
      ...prev,
      [statsKey]: ''
    }));
  };

  const handleRetryAllQuestions = () => {
    if (!fullScreenNews || currentQuestions.length === 0) {
      return;
    }

    const targetKeys = currentQuestions.map((question) => getQuestionStatsKey(fullScreenNews.id, question.id));

    setSubmittedAnswers((prev) => {
      const nextState = { ...prev };
      targetKeys.forEach((key) => {
        nextState[key] = false;
      });
      return nextState;
    });

    setUserAnswers((prev) => {
      const nextState = { ...prev };
      targetKeys.forEach((key) => {
        nextState[key] = '';
      });
      return nextState;
    });

    closeOptionNoteEditor();
    setHoveredOptionKey('');

    requestAnimationFrame(() => {
      questionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const startOptionNotePress = (question, optionLetter) => {
    if (question.optionNotes?.[optionLetter]) {
      setOptionNotePreview({ questionId: question.id, optionLetter });
    }
  };

  const clearOptionNotePress = () => {
  };

  const completeOptionNotePress = (question, optionLetter, hasNote) => {
    clearOptionNotePress();

    openOptionNoteEditor(question, optionLetter);
  };

  const handleDeleteQuestion = (questionId) => {
    if (!fullScreenNews) {
      return;
    }

    setQuestionEntry(fullScreenNews.id, (entry) => removeQuestionFromEntry(entry, questionId));
  };

  const openSortManager = () => {
    setIsNoteEditing(false);
    setIsQuestionEditing(false);
    setEditingQuestionId('');
    setDraggedQuestionId('');
    setDragOverQuestionId('');
    setSortDraftEntry({
      ...currentQuestionEntry,
      sortMode: 'custom',
      items: [...currentQuestions]
    });
    setIsSortManagerOpen(true);
  };

  const handleSortRowDrop = (targetQuestionId) => {
    if (!draggedQuestionId) {
      return;
    }

    setSortDraftEntry((prev) => moveQuestionBefore(prev, draggedQuestionId, targetQuestionId));
    setDraggedQuestionId('');
    setDragOverQuestionId('');
  };

  const handleSaveSortOrder = () => {
    if (!fullScreenNews) {
      return;
    }

    setQuestionEntry(fullScreenNews.id, sortDraftEntry);
    setIsSortManagerOpen(false);
    setDraggedQuestionId('');
    setDragOverQuestionId('');
  };

  const handleCloseSortManager = () => {
    setIsSortManagerOpen(false);
    setDraggedQuestionId('');
    setDragOverQuestionId('');
  };

  const handleQuestionSortModeChange = (sortMode) => {
    if (!fullScreenNews) {
      return;
    }

    setQuestionEntry(fullScreenNews.id, (entry) => ({ ...entry, sortMode }));
    setIsSortMenuOpen(false);
  };

  if (filteredNews.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '72px 20px',
        color: '#8a8a8a'
      }}>
        <span style={{ fontSize: '48px', marginBottom: '16px' }}>📭</span>
        <p style={{ fontSize: '16px', marginBottom: '20px' }}>暂无相关新闻</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px' }}>
      {filteredNews.map((news) => {
        const cardReferences = getReferenceList(news);
        const previewText = buildPreviewHighlights(news);
        const questionCount = normalizeQuestionEntry(questions[news.id]).items.length;

        return (
          <article
            key={news.id}
            ref={(node) => {
              if (node) {
                cardRefs.current.set(news.id, node);
                return;
              }

              cardRefs.current.delete(news.id);
            }}
            onClick={() => openFullScreen(news)}
            style={{
              position: 'relative',
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: '#fff',
              borderRadius: '18px',
              padding: isMobile ? '16px' : '20px 22px',
              border: '1px solid #e7e7e7',
              boxShadow: '0 10px 24px rgba(18, 24, 40, 0.06)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(event) => {
              if (isMobile) {
                return;
              }

              event.currentTarget.style.transform = 'translateY(-2px)';
              event.currentTarget.style.boxShadow = '0 16px 32px rgba(18, 24, 40, 0.1)';
            }}
            onMouseLeave={(event) => {
              if (isMobile) {
                return;
              }

              event.currentTarget.style.transform = 'translateY(0)';
              event.currentTarget.style.boxShadow = '0 10px 24px rgba(18, 24, 40, 0.06)';
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: '12px'
            }}>
              <div style={{
                background: '#f3f4f6',
                color: '#5b6470',
                padding: '6px 10px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap'
              }}>
                {news.date.replace(/-/g, '.')}
              </div>

              <h2 style={{
                margin: 0,
                fontSize: isMobile ? '17px' : '20px',
                lineHeight: 1.55,
                color: '#171717',
                fontWeight: 700,
                fontFamily: '"Noto Serif SC", serif',
                flex: 1
              }}>
                {news.title}
              </h2>
            </div>

            <div style={{
              width: '100%',
              minHeight: isMobile ? '150px' : '176px',
              padding: isMobile ? '16px' : '18px 20px',
              background: 'linear-gradient(135deg, #f8f7f2 0%, #efe8dd 100%)',
              border: '1px solid #ebe2d3',
              borderRadius: '16px',
              color: '#6b5d48',
              fontSize: '14px',
              lineHeight: 1.9,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {previewText}
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? '12px' : '10px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                flex: 1
              }}>
                {news.source === '自定义' && (
                  <span style={{
                    background: '#f3e8ff',
                    color: '#7c3aed',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    自定义
                  </span>
                )}
                {news.source !== '自定义' && !hasVerifiedSource(news) && (
                  <span style={{
                    background: '#fff7ed',
                    color: '#c2410c',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    整理摘要
                  </span>
                )}
                {news.source !== '自定义' && hasVerifiedSource(news) && (
                  <span style={{
                    background: '#ecfdf3',
                    color: '#15803d',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    已核原文
                  </span>
                )}
                {notes[news.id] && (
                  <span style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    笔记
                  </span>
                )}
                {questionCount > 0 && (
                  <span style={{
                    background: '#fff3e0',
                    color: '#ef6c00',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    题目 {questionCount}
                  </span>
                )}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'flex-end' : 'flex-start',
                gap: '12px'
              }}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.currentTarget.blur();
                    onSaveNews(news.id);
                  }}
                  style={getPlainIconStyle({ active: isSaved(news.id) })}
                  title={isSaved(news.id) ? '取消收藏' : '收藏'}
                >
                  <BookmarkIcon
                    filled={isSaved(news.id)}
                    size={19}
                    color={isSaved(news.id) ? '#f59e0b' : '#667085'}
                    style={{ transform: 'translateY(0.5px)' }}
                  />
                </button>
                <div
                  style={{ position: 'relative', paddingTop: '6px', marginTop: '-6px' }}
                  data-popup-layer="true"
                  onMouseEnter={() => {
                    if (!isMobile && cardReferences.length > 1) {
                      if (cardSourceCloseTimerRef.current) {
                        clearTimeout(cardSourceCloseTimerRef.current);
                        cardSourceCloseTimerRef.current = null;
                      }
                      setCardSourceMenuId(String(news.id));
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isMobile) {
                      if (cardSourceCloseTimerRef.current) {
                        clearTimeout(cardSourceCloseTimerRef.current);
                      }
                      cardSourceCloseTimerRef.current = setTimeout(() => {
                        setCardSourceMenuId('');
                        cardSourceCloseTimerRef.current = null;
                      }, 180);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!cardReferences.length) {
                        return;
                      }
                      openReferenceAction(cardReferences, { menuId: String(news.id) });
                    }}
                  style={getPlainIconStyle({ disabled: !cardReferences.length })}
                  title={!cardReferences.length ? '当前没有可用来源' : cardReferences.length === 1 ? '打开来源链接' : '查看全部来源'}
                >
                    <LinkIcon size={19} style={{ transform: 'translate(-1px, 3.5px)' }} />
                  </button>
                  {cardSourceMenuId === String(news.id) && cardReferences.length > 1 && (
                    <div
                      data-popup-layer="true"
                      onClick={(event) => event.stopPropagation()}
                      style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 'calc(100% - 14px)',
                        width: isMobile ? 'min(228px, calc(100vw - 64px))' : '228px',
                        maxWidth: 'calc(100vw - 56px)',
                        background: 'rgba(255,255,255,0.48)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '12px',
                        border: '1px solid rgba(219,228,239,0.42)',
                        boxShadow: '0 8px 18px rgba(15,23,42,0.07)',
                        padding: '3px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px',
                        zIndex: 30
                      }}
                    >
                      {cardReferences.map((reference, index) => (
                        <a
                          key={reference.id}
                          href={reference.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setCardSourceMenuId('')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minHeight: '34px',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            border: 'none',
                            background: index === 0 ? 'rgba(239,246,255,0.3)' : 'rgba(255,255,255,0.12)',
                            textDecoration: 'none',
                            transition: 'background 0.18s ease'
                          }}
                        >
                          <span style={{
                            minWidth: '38px',
                            height: '22px',
                            padding: '0 8px',
                            borderRadius: '999px',
                            background: index === 0 ? 'rgba(219,234,254,0.72)' : 'rgba(241,245,249,0.56)',
                            color: index === 0 ? '#1d4ed8' : '#64748b',
                            fontSize: '11px',
                            fontWeight: 700,
                            textAlign: 'center',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {index === 0 ? '官方' : '转载'}
                          </span>
                          <span style={{
                            color: '#334155',
                            fontSize: '13px',
                            lineHeight: 1.25,
                            wordBreak: 'break-word',
                            display: 'flex',
                            alignItems: 'center',
                            flex: 1
                          }}>
                            {reference.label}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {isFullScreen && fullScreenNews && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(13, 18, 27, 0.72)',
          zIndex: 1000,
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'center',
          padding: isMobile ? '12px' : '24px'
        }} onClick={closeFullScreen}>
          <div style={{
            width: '100%',
            maxWidth: '980px',
            maxHeight: isMobile ? '100%' : '92vh',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: isMobile ? '20px' : '24px',
            padding: isMobile ? '18px 30px 236px 44px' : '28px 30px 120px',
            boxShadow: '0 24px 56px rgba(13, 18, 27, 0.28)',
            position: 'relative'
          }} onClick={(event) => event.stopPropagation()}>
            <h1 style={{
              margin: '0 0 14px',
              fontSize: isMobile ? '22px' : '28px',
              fontWeight: 700,
              lineHeight: 1.6,
              color: '#1f2937',
              fontFamily: '"Noto Serif SC", serif',
              paddingRight: isMobile ? '44px' : '56px'
            }}>
              {fullScreenNews.title}
            </h1>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '22px'
            }}>
              <span style={{
                background: '#f4f6f8',
                color: '#5b6470',
                padding: '5px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {formatDate(fullScreenNews.date)}
              </span>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{getSourceDisplay(fullScreenNews)}</span>
            </div>

            {isCardEditing && fullScreenNews.source === '自定义' && (
              <div style={{
                marginBottom: '24px',
                padding: isMobile ? '14px' : '18px',
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: '18px'
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '17px', color: '#581c87' }}>编辑自定义卡片</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6b21a8' }}>原文链接</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                      <input
                        ref={cardEditorRef}
                        type="url"
                        value={cardDraft.sourceUrl}
                        onChange={(event) => {
                          setCardDraft((prev) => ({ ...prev, sourceUrl: event.target.value }));
                          setCardEditError('');
                          setCardEditStatus('');
                        }}
                        onBlur={() => {
                          if (cardDraft.sourceUrl.trim()) {
                            handleImportCardEdit(false);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1px solid #d8b4fe',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleImportCardEdit(true)}
                        disabled={isCardImporting}
                        style={{
                          minWidth: '96px',
                          padding: '0 14px',
                          borderRadius: '12px',
                          border: 'none',
                          background: isCardImporting ? '#c4b5fd' : '#7c3aed',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: isCardImporting ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isCardImporting ? '抓取中' : '重新抓取'}
                      </button>
                    </div>
                    {(cardEditStatus || cardEditError) && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        lineHeight: 1.7,
                        color: cardEditError ? '#dc2626' : '#6b21a8'
                      }}>
                        {cardEditError || cardEditStatus}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6b21a8' }}>标题</label>
                    <input
                      type="text"
                      value={cardDraft.title}
                      onChange={(event) => setCardDraft((prev) => ({ ...prev, title: event.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #d8b4fe',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6b21a8' }}>日期</label>
                    <input
                      type="date"
                      lang="zh-CN"
                      inputMode="none"
                      value={cardDraft.date}
                      onChange={(event) => setCardDraft((prev) => ({ ...prev, date: event.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #d8b4fe',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6b21a8' }}>卡片摘要</label>
                    <textarea
                      value={cardDraft.summary}
                      onChange={(event) => setCardDraft((prev) => ({ ...prev, summary: event.target.value }))}
                      style={{
                        width: '100%',
                        minHeight: '96px',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #d8b4fe',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6b21a8' }}>整理正文</label>
                    <textarea
                      value={cardDraft.detailContent}
                      onChange={(event) => setCardDraft((prev) => ({ ...prev, detailContent: event.target.value }))}
                      style={{
                        width: '100%',
                        minHeight: '220px',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: '1px solid #d8b4fe',
                        fontSize: '14px',
                        lineHeight: 1.8,
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  {cardEditError && !cardEditStatus && (
                    <div style={{ fontSize: '13px', color: '#dc2626', lineHeight: 1.7 }}>
                      {cardEditError}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleDeleteCustomCard}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: '1px solid #fecaca',
                        background: '#fff5f5',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}
                    >
                      删除卡片
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCardEditing(false);
                        setCardEditError('');
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: '1px solid #d8b4fe',
                        background: '#fff',
                        color: '#6b21a8',
                        cursor: 'pointer'
                      }}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCardEdit}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '12px',
                        border: 'none',
                        background: '#7c3aed',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      保存卡片
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              ref={detailBodyRef}
              onMouseUp={handleDetailTextSelection}
              onTouchEnd={handleDetailTextSelection}
              style={{
              fontSize: isMobile ? '15px' : '16px',
              lineHeight: 2.05,
              color: '#243042',
              fontFamily: '"Noto Serif SC", serif',
              marginBottom: '28px'
            }}>
              {detailParagraphs.map((paragraph, index) => (
                <p
                  key={`${fullScreenNews.id}_paragraph_${index}`}
                  data-detail-paragraph="true"
                  data-paragraph-index={index}
                  style={{
                  marginBottom: '20px',
                  textIndent: '2em',
                  textAlign: 'justify',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}>
                  {renderMarkedParagraph(
                    paragraph,
                    currentContentMarks.filter((mark) => mark.paragraphIndex === index)
                  )}
                </p>
              ))}
            </div>
            {textSelectionMenu.visible && (
              <div
                data-selection-toolbar="true"
                style={{
                  position: 'fixed',
                  left: `${textSelectionMenu.x}px`,
                  top: `${textSelectionMenu.y}px`,
                  transform: 'translate(-50%, -100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: '10px',
                  padding: '10px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(18px)',
                  border: '1px solid rgba(203,213,225,0.7)',
                  boxShadow: '0 18px 36px rgba(15,23,42,0.14)',
                  zIndex: 1006,
                  maxWidth: 'calc(100vw - 24px)',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'nowrap',
                  whiteSpace: 'nowrap',
                  overflowX: 'hidden'
                }}>
                  <button
                    type="button"
                    onMouseDown={() => startTextStyleLongPress('highlight')}
                    onMouseUp={stopTextStyleLongPress}
                    onMouseLeave={stopTextStyleLongPress}
                    onTouchStart={() => startTextStyleLongPress('highlight')}
                    onTouchEnd={stopTextStyleLongPress}
                    onClick={() => handleStyleButtonClick('highlight')}
                    style={{
                      border: '1px solid rgba(203,213,225,0.82)',
                      background: selectedHighlightColor,
                      color: '#0f172a',
                      borderRadius: '999px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      boxShadow: textStyleSettings === 'highlight' ? '0 0 0 2px rgba(59,130,246,0.12)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    高亮
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => startTextStyleLongPress('underline')}
                    onMouseUp={stopTextStyleLongPress}
                    onMouseLeave={stopTextStyleLongPress}
                    onTouchStart={() => startTextStyleLongPress('underline')}
                    onTouchEnd={stopTextStyleLongPress}
                    onClick={() => handleStyleButtonClick('underline')}
                    style={{
                      border: '1px solid rgba(203,213,225,0.82)',
                      background: selectedUnderlineColor,
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      boxShadow: textStyleSettings === 'underline' ? '0 0 0 2px rgba(59,130,246,0.12)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    下划线
                  </button>
                  {linkTextColorToBold ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onMouseDown={() => startTextStyleLongPress('textColor')}
                        onMouseUp={stopTextStyleLongPress}
                        onMouseLeave={stopTextStyleLongPress}
                        onTouchStart={() => startTextStyleLongPress('textColor')}
                        onTouchEnd={stopTextStyleLongPress}
                        onClick={() => handleStyleButtonClick('textColor')}
                        style={{
                          border: '1px solid rgba(203,213,225,0.82)',
                          background: selectedTextColor,
                          color: '#ffffff',
                          borderRadius: '999px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          boxShadow: textStyleSettings === 'textColor' ? '0 0 0 2px rgba(59,130,246,0.12)' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        字色+加粗
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkTextColorToBold(false)}
                        title="解锁字色和加粗"
                        style={{
                          border: '1px solid rgba(203,213,225,0.68)',
                          background: 'rgba(255,255,255,0.72)',
                          color: '#2563eb',
                          width: '24px',
                          height: '24px',
                          borderRadius: '999px',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <LinkIcon size={13} color="#2563eb" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onMouseDown={() => startTextStyleLongPress('textColor')}
                        onMouseUp={stopTextStyleLongPress}
                        onMouseLeave={stopTextStyleLongPress}
                        onTouchStart={() => startTextStyleLongPress('textColor')}
                        onTouchEnd={stopTextStyleLongPress}
                        onClick={() => handleStyleButtonClick('textColor')}
                        style={{
                          border: '1px solid rgba(203,213,225,0.82)',
                          background: selectedTextColor,
                          color: '#ffffff',
                          borderRadius: '999px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          boxShadow: textStyleSettings === 'textColor' ? '0 0 0 2px rgba(59,130,246,0.12)' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        字色
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkTextColorToBold(true)}
                        title="锁定字色和加粗"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#94a3b8',
                          width: '20px',
                          height: '20px',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <LinkIcon size={12} color="#94a3b8" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextMark('bold')}
                        style={{
                          border: '1px solid rgba(203,213,225,0.82)',
                          background: '#ffffff',
                          color: '#0f172a',
                          borderRadius: '999px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          boxShadow: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        加粗
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={clearTextMark}
                    style={{
                      border: '1px solid rgba(203,213,225,0.82)',
                      background: '#ffffff',
                      color: '#7f1d1d',
                      borderRadius: '999px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      boxShadow: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    清除样式
                  </button>
                </div>
                {textStyleSettings && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      padding: '10px 12px',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.88)',
                      border: '1px solid rgba(226,232,240,0.9)'
                    }}
                  >
                    {textStyleSettings === 'highlight' && HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={`highlight_${color}`}
                        type="button"
                        onClick={() => {
                          setSelectedHighlightColor(color);
                          setStyleConfigured((prev) => ({ ...prev, highlight: true }));
                          applyTextMark('highlight', color);
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '999px',
                          border: color === selectedHighlightColor ? '2px solid #1d4ed8' : '1px solid rgba(148,163,184,0.45)',
                          background: color,
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                    {textStyleSettings === 'underline' && UNDERLINE_COLORS.map((color) => (
                      <button
                        key={`underline_${color}`}
                        type="button"
                        onClick={() => {
                          setSelectedUnderlineColor(color);
                          setStyleConfigured((prev) => ({ ...prev, underline: true }));
                          applyTextMark('underline', color);
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '999px',
                          border: color === selectedUnderlineColor ? '2px solid #1d4ed8' : '1px solid rgba(148,163,184,0.45)',
                          background: color,
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                    {textStyleSettings === 'textColor' && TEXT_COLORS.map((color) => (
                      <button
                        key={`text_${color}`}
                        type="button"
                        onClick={() => {
                          setSelectedTextColor(color);
                          setStyleConfigured((prev) => ({ ...prev, textColor: true }));
                          applyTextMark('textColor', color);
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '999px',
                          border: color === selectedTextColor ? '2px solid #1d4ed8' : '1px solid rgba(148,163,184,0.45)',
                          background: '#fff',
                          color,
                          cursor: 'pointer',
                          fontWeight: 800,
                          fontSize: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        A
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
            {(currentQuestions.length > 0 || isQuestionEditing) && (
            <section
              ref={questionSectionRef}
              style={{
              order: 2,
              marginBottom: 0,
              padding: isMobile ? '16px' : '18px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '18px'
            }}>
              <QuestionPracticeHeader
                isMobile={isMobile}
                currentQuestionsLength={currentQuestions.length}
                currentArticleStats={currentArticleStats}
                currentQuestionEntry={currentQuestionEntry}
                isSortMenuOpen={isSortMenuOpen}
                onToggleSortMenu={() => setIsSortMenuOpen((prev) => !prev)}
                onSetSortMode={handleQuestionSortModeChange}
                onOpenSortManager={openSortManager}
                SortIcon={SortIcon}
              />

              {isQuestionEditing && (
                <QuestionEditorPanel
                  isMobile={isMobile}
                  editingQuestionId={editingQuestionId}
                  questionDraft={questionDraft}
                  questionTextareaRef={questionTextareaRef}
                  onChangeDraft={setQuestionDraft}
                  onCancel={handleCancelQuestionEditor}
                  onSave={handleSaveQuestions}
                />
              )}

              <QuestionListSection
                currentQuestions={currentQuestions}
                fullScreenNews={fullScreenNews}
                userAnswers={userAnswers}
                submittedAnswers={submittedAnswers}
                questionStats={questionStats}
                getQuestionPerformance={getQuestionPerformance}
                isMobile={isMobile}
                firstQuestionCardRef={firstQuestionCardRef}
                handleOpenQuestionEditor={handleOpenQuestionEditor}
                handleDeleteQuestion={handleDeleteQuestion}
                handleQuestionChoice={handleQuestionChoice}
                optionNoteEditor={optionNoteEditor}
                optionNotePreview={optionNotePreview}
                hoveredOptionKey={hoveredOptionKey}
                setHoveredOptionKey={setHoveredOptionKey}
                openOptionNoteEditor={openOptionNoteEditor}
                closeOptionNoteEditor={closeOptionNoteEditor}
                handleSaveOptionNote={handleSaveOptionNote}
                handleDeleteOptionNote={handleDeleteOptionNote}
                setOptionNotePreview={setOptionNotePreview}
                setIsOptionListMenuOpen={setIsOptionListMenuOpen}
                isOptionListMenuOpen={isOptionListMenuOpen}
                syncEditorHtml={syncEditorHtml}
                handleEditorCompositionStart={handleEditorCompositionStart}
                handleEditorCompositionEnd={handleEditorCompositionEnd}
                applyRichTextCommand={applyRichTextCommand}
                optionNoteEditorRef={optionNoteEditorRef}
                handleRetryQuestion={handleRetryQuestion}
                normalizeRichText={normalizeRichText}
                BoldIcon={BoldIcon}
                NoteIcon={NoteIcon}
                PlusIcon={PlusIcon}
                UnorderedListIcon={UnorderedListIcon}
              />
            </section>
            )}

            <NoteSection
              hasNote={hasNote}
              isNoteEditing={isNoteEditing}
              isMobile={isMobile}
              noteSectionRef={noteSectionRef}
              setIsQuestionEditing={setIsQuestionEditing}
              setEditingQuestionId={setEditingQuestionId}
              setIsSortManagerOpen={setIsSortManagerOpen}
              setIsNoteEditing={setIsNoteEditing}
              applyRichTextCommand={applyRichTextCommand}
              setIsMainListMenuOpen={setIsMainListMenuOpen}
              isMainListMenuOpen={isMainListMenuOpen}
              noteEditorRef={noteEditorRef}
              syncEditorHtml={syncEditorHtml}
              handleEditorCompositionStart={handleEditorCompositionStart}
              handleEditorCompositionEnd={handleEditorCompositionEnd}
              handleAutoSaveNote={handleAutoSaveNote}
              noteContent={noteContent}
              handleDeleteNote={handleDeleteNote}
              handleCancelNote={handleCancelNote}
              handleSaveNote={handleSaveNote}
              notes={notes}
              fullScreenNews={fullScreenNews}
              normalizeRichText={normalizeRichText}
              BoldIcon={BoldIcon}
              UnorderedListIcon={UnorderedListIcon}
            />
            </div>

            <button
              type="button"
              onClick={closeFullScreen}
              style={{
                position: 'fixed',
                top: isMobile ? '18px' : '24px',
                right: isMobile ? '18px' : '24px',
                width: '46px',
                height: '46px',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.36)',
                background: 'rgba(100, 116, 139, 0.52)',
                color: '#fff',
                fontSize: '24px',
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 1002,
                backdropFilter: 'blur(8px)',
                boxShadow: '0 10px 24px rgba(15,23,42,0.18)'
              }}
            >
              ×
            </button>

              <LeftFloatingActions
                isMobile={isMobile}
                fullScreenNews={fullScreenNews}
                handleOpenCardEditor={handleOpenCardEditor}
                handleDeleteCustomCard={handleDeleteCustomCard}
                hasNote={hasNote}
                setIsQuestionEditing={setIsQuestionEditing}
                setEditingQuestionId={setEditingQuestionId}
                setIsSortManagerOpen={setIsSortManagerOpen}
                setIsNoteEditing={setIsNoteEditing}
              handleOpenQuestionEditor={handleOpenQuestionEditor}
              handleRetryAllQuestions={handleRetryAllQuestions}
              EditIcon={EditIcon}
              NoteIcon={NoteIcon}
                PlusIcon={PlusIcon}
                RefreshIcon={RefreshIcon}
                TrashIcon={TrashIcon}
              />

            <RightFloatingActions
              isMobile={isMobile}
              aiButtonRef={aiButtonRef}
              sourceButtonRef={sourceButtonRef}
              sourcePopupRef={sourcePopupRef}
              aiPopupRef={aiPopupRef}
              setIsSourceMenuOpen={setIsSourceMenuOpen}
              setIsAiOpen={setIsAiOpen}
              isSaved={isSaved}
              onSaveNews={onSaveNews}
              fullScreenNews={fullScreenNews}
              fullScreenReferences={fullScreenReferences}
              openReferenceAction={openReferenceAction}
              isSourceMenuOpen={isSourceMenuOpen}
              isAiOpen={isAiOpen}
              isDoubaoReady={isDoubaoReady}
              aiMessages={aiMessages}
              isAiLoading={isAiLoading}
              aiQuery={aiQuery}
              setAiQuery={setAiQuery}
              handleAiQuery={handleAiQuery}
              SparkleIcon={SparkleIcon}
              BookmarkIcon={BookmarkIcon}
              LinkIcon={LinkIcon}
            />
          </div>

          <QuestionSortManagerModal
            isMobile={isMobile}
            isOpen={isSortManagerOpen}
            sortDraftEntry={sortDraftEntry}
            draggedQuestionId={draggedQuestionId}
            dragOverQuestionId={dragOverQuestionId}
            onDragStart={(questionId) => {
              setDraggedQuestionId(questionId);
              setDragOverQuestionId(questionId);
            }}
            onDragOver={setDragOverQuestionId}
            onDrop={handleSortRowDrop}
            onDragEnd={() => {
              setDraggedQuestionId('');
              setDragOverQuestionId('');
            }}
            onClose={handleCloseSortManager}
            onSave={handleSaveSortOrder}
            GripIcon={GripIcon}
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;
