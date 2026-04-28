import { normalizeUrl } from './cardImport';

const normalizeLoose = (value = '') => String(value || '')
  .replace(/\s+/g, '')
  .replace(/[。！？；，、“”"'…\.（）()《》【】\[\]：:、\-—]/g, '')
  .trim();

const getComparableTitle = (card) => normalizeLoose(
  String(card?.title || '')
    .replace(/中华人民共和国教育部.*$/, '')
    .replace(/政府门户网站$/, '')
);

const getComparableBody = (card) => normalizeLoose(
  card?.detailContent || card?.content || card?.summary || ''
);

const getComparableSummary = (card) => normalizeLoose(
  card?.summary || card?.content || ''
);

const collectCardUrls = (card) => {
  const urlSet = new Set();

  [card?.sourceUrl, card?.verifiedSourceUrl].forEach((value) => {
    const normalized = normalizeUrl(value || '');
    if (normalized) {
      urlSet.add(normalized);
    }
  });

  if (Array.isArray(card?.references)) {
    card.references.forEach((item) => {
      const normalized = normalizeUrl(item?.url || '');
      if (normalized) {
        urlSet.add(normalized);
      }
    });
  }

  return [...urlSet];
};

const titlesLookSame = (left, right) => {
  const a = getComparableTitle(left);
  const b = getComparableTitle(right);

  if (!a || !b || Math.min(a.length, b.length) < 8) {
    return false;
  }

  return a === b || a.includes(b) || b.includes(a);
};

const textLooksOverlapped = (leftText = '', rightText = '') => {
  if (!leftText || !rightText) {
    return false;
  }

  const shorter = leftText.length <= rightText.length ? leftText : rightText;
  const longer = leftText.length > rightText.length ? leftText : rightText;

  if (shorter.length < 80) {
    return false;
  }

  const probe = shorter.slice(0, Math.min(shorter.length, 160));
  return Boolean(probe && longer.includes(probe));
};

const cardsLookSameByContent = (left, right) => {
  if (!titlesLookSame(left, right)) {
    return false;
  }

  const leftBody = getComparableBody(left);
  const rightBody = getComparableBody(right);

  if (textLooksOverlapped(leftBody, rightBody)) {
    return true;
  }

  const leftSummary = getComparableSummary(left);
  const rightSummary = getComparableSummary(right);

  if (textLooksOverlapped(leftSummary, rightSummary)) {
    return true;
  }

  return leftSummary && rightSummary && leftSummary === rightSummary && leftSummary.length >= 30;
};

export const findDuplicateCard = (cards = [], candidate = {}, excludeId = null) => {
  const candidateUrls = collectCardUrls(candidate);

  for (const card of cards) {
    if (!card || card.id === excludeId) {
      continue;
    }

    const existingUrls = collectCardUrls(card);
    if (candidateUrls.length > 0 && candidateUrls.some((url) => existingUrls.includes(url))) {
      return {
        card,
        reason: 'url'
      };
    }
  }

  for (const card of cards) {
    if (!card || card.id === excludeId) {
      continue;
    }

    if (cardsLookSameByContent(card, candidate)) {
      return {
        card,
        reason: 'content'
      };
    }
  }

  return null;
};

export const formatDuplicateMessage = (duplicateResult) => {
  if (!duplicateResult?.card) {
    return '';
  }

  return duplicateResult.reason === 'content'
    ? `检测到重复内容：${duplicateResult.card.title}`
    : `该链接已存在：${duplicateResult.card.title}`;
};
