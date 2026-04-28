const DEFAULT_SORT_MODE = 'desc';
const QUESTION_START_PATTERN = /^(?:第?\d+题[\.\、:：]?\s*|\d+[\.\、\)）]\s*|题号\s*[:：]|题目\s*[:：])/i;
const OPTION_PATTERN = /^([A-H])[\.．、:：\)）]\s*(.+)$/i;
const ANSWER_PATTERN = /^(?:[\[【(（]?\s*(?:正确)?答案\s*[\]】)）]?\s*[:：]?\s*)([A-H])\s*$/i;

const normalizeLineBreaks = (value = '') => value.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');

const createQuestionId = () => `question_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeOptionLines = (text) => {
  return text
    .replace(/([^\n])\s+((?:[\[【(（]?\s*(?:正确)?答案\s*[\]】)）]?\s*[:：]?))/gi, '$1\n$2')
    .replace(/([^\n])\s+([A-H][\.．、:：\)）])/gi, '$1\n$2');
};

const cleanQuestionTitle = (line) => {
  return line
    .replace(/^题号\s*[:：]?\s*/i, '')
    .replace(/^题目\s*[:：]?\s*/i, '')
    .replace(/^\d+[\.\、\)]\s*/, '')
    .trim();
};

const splitQuestionBlocks = (input) => {
  const normalized = normalizeOptionLines(normalizeLineBreaks(input)).trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks = [];
  let currentBlock = [];

  lines.forEach((line) => {
    const isQuestionStart = QUESTION_START_PATTERN.test(line);
    const hasCurrentQuestion = currentBlock.some((item) => OPTION_PATTERN.test(item) || ANSWER_PATTERN.test(item) || QUESTION_START_PATTERN.test(item));

    if (isQuestionStart && currentBlock.length > 0 && hasCurrentQuestion) {
      blocks.push(currentBlock.join('\n'));
      currentBlock = [line];
      return;
    }

    currentBlock.push(line);
  });

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'));
  }

  return blocks;
};

export const parseQuestionsFromText = (input) => {
  return splitQuestionBlocks(input)
    .map((block, index) => {
      const lines = normalizeOptionLines(block)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const titleLines = [];
      const options = [];
      let answer = '';
      let explanation = '';
      let currentSection = 'title';

      lines.forEach((line) => {
        const normalizedLine = line
          .replace(/^\*+|\*+$/g, '')
          .replace(/^[-•]\s*/, '')
          .trim();

        if (!normalizedLine || /^[-_]{3,}$/.test(normalizedLine)) {
          return;
        }

        const answerMatch = normalizedLine.match(ANSWER_PATTERN);
        if (answerMatch) {
          answer = answerMatch[1].toUpperCase();
          currentSection = 'answer';
          return;
        }

        if (/^(?:[\[【(（]?\s*解析\s*[\]】)）]?\s*[:：]?).*$/i.test(normalizedLine)) {
          currentSection = 'explanation';
          const inlineExplanation = normalizedLine
            .replace(/^(?:[\[【(（]?\s*解析\s*[\]】)）]?\s*[:：]?\s*)/i, '')
            .trim();
          if (inlineExplanation) {
            explanation = explanation ? `${explanation}\n${inlineExplanation}` : inlineExplanation;
          }
          return;
        }

        if (/^(?:[\[【(（]?\s*(?:命题来源|来源|选项分析|教育时政单选题)\s*[\]】)）]?\s*[:：]?).*$/i.test(normalizedLine)) {
          currentSection = 'meta';
          return;
        }

        const optionMatch = normalizedLine.match(OPTION_PATTERN);
        if (optionMatch) {
          options.push({
            letter: optionMatch[1].toUpperCase(),
            text: optionMatch[2].trim()
          });
          currentSection = 'options';
          return;
        }

        const cleanedLine = cleanQuestionTitle(
          normalizedLine
            .replace(/^\*+|\*+$/g, '')
            .replace(/^[\[【(（].*?(单选题|多选题|判断题).*?[\]】)）]$/i, '')
            .trim()
        );

        if (cleanedLine) {
          if (currentSection === 'explanation') {
            explanation = explanation ? `${explanation}\n${cleanedLine}` : cleanedLine;
            return;
          }

          if (currentSection === 'meta') {
            return;
          }

          if (/^(这是一道|适用于|根据.+设计的|根据.+命制的)/.test(cleanedLine) && options.length === 0) {
            return;
          }

          titleLines.push(cleanedLine);
        }
      });

      const title = titleLines
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!title && options.length === 0 && !answer) {
        return null;
      }

      return {
        id: `parsed_${index + 1}`,
        title,
        options,
        answer,
        explanation: explanation.trim(),
        rawText: block.trim()
      };
    })
    .filter(Boolean);
};

const normalizeQuestionItem = (item, fallbackIndex = 0) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const parsedOptions = Array.isArray(item.options)
    ? item.options
        .map((option, optionIndex) => {
          if (!option) {
            return null;
          }

          if (typeof option === 'string') {
            const fallbackLetter = String.fromCharCode(65 + optionIndex);
            return {
              letter: fallbackLetter,
              text: option.trim()
            };
          }

          return {
            letter: String(option.letter || String.fromCharCode(65 + optionIndex)).toUpperCase(),
            text: String(option.text || '').trim()
          };
        })
        .filter((option) => option && option.text)
    : [];

  const title = String(item.title || '').trim();
  const answer = String(item.answer || '').trim().toUpperCase();
  const explanation = String(item.explanation || '').trim();
  const optionNotes = item.optionNotes && typeof item.optionNotes === 'object'
    ? Object.entries(item.optionNotes).reduce((result, [letter, value]) => {
        const normalizedValue = String(value || '').trim();
        if (normalizedValue) {
          result[String(letter).toUpperCase()] = normalizedValue;
        }
        return result;
      }, {})
    : {};

  if (!title && parsedOptions.length === 0 && !answer && !explanation) {
    return null;
  }

  return {
    id: item.id || createQuestionId(),
    title,
    options: parsedOptions,
    answer,
    explanation,
    optionNotes,
    rawText: String(item.rawText || '').trim(),
    createdAt: Number(item.createdAt) || Date.now() + fallbackIndex,
    addedOrder: Number(item.addedOrder) || fallbackIndex + 1
  };
};

export const normalizeQuestionEntry = (entry) => {
  if (!entry) {
    return {
      sortMode: DEFAULT_SORT_MODE,
      items: []
    };
  }

  if (typeof entry === 'string') {
    return {
      sortMode: DEFAULT_SORT_MODE,
      items: parseQuestionsFromText(entry).map((question, index) =>
        normalizeQuestionItem(
          {
            ...question,
            id: createQuestionId(),
            createdAt: Date.now() + index,
            addedOrder: index + 1
          },
          index
        )
      ).filter(Boolean)
    };
  }

  if (Array.isArray(entry)) {
    return {
      sortMode: DEFAULT_SORT_MODE,
      items: entry.map((item, index) => normalizeQuestionItem(item, index)).filter(Boolean)
    };
  }

  const items = Array.isArray(entry.items)
    ? entry.items.map((item, index) => normalizeQuestionItem(item, index)).filter(Boolean)
    : [];

  if (items.length === 0 && typeof entry.content === 'string') {
    return normalizeQuestionEntry(entry.content);
  }

  return {
    sortMode: ['asc', 'desc', 'custom'].includes(entry.sortMode) ? entry.sortMode : DEFAULT_SORT_MODE,
    items
  };
};

export const normalizeQuestionBank = (questionBank) => {
  if (!questionBank || typeof questionBank !== 'object') {
    return {};
  }

  return Object.entries(questionBank).reduce((result, [newsId, entry]) => {
    result[newsId] = normalizeQuestionEntry(entry);
    return result;
  }, {});
};

export const appendQuestionsToEntry = (entry, rawText) => {
  const normalizedEntry = normalizeQuestionEntry(entry);
  const nextQuestions = parseQuestionsFromText(rawText);

  if (nextQuestions.length === 0) {
    return normalizedEntry;
  }

  const lastOrder = normalizedEntry.items.reduce((maxValue, item) => Math.max(maxValue, Number(item.addedOrder) || 0), 0);
  const lastCreatedAt = normalizedEntry.items.reduce((maxValue, item) => Math.max(maxValue, Number(item.createdAt) || 0), 0);
  const baseTime = Math.max(Date.now(), lastCreatedAt + 1);

  const appendedItems = nextQuestions.map((question, index) =>
    normalizeQuestionItem(
      {
        ...question,
        id: createQuestionId(),
        createdAt: baseTime + index,
        addedOrder: lastOrder + index + 1
      },
      normalizedEntry.items.length + index
    )
  ).filter(Boolean);

  return {
    ...normalizedEntry,
    items: [...normalizedEntry.items, ...appendedItems]
  };
};

export const getSortedQuestions = (entry) => {
  const normalizedEntry = normalizeQuestionEntry(entry);

  if (normalizedEntry.sortMode === 'custom') {
    return normalizedEntry.items;
  }

  const sortedItems = [...normalizedEntry.items].sort((a, b) => {
    const orderDifference = (a.addedOrder || 0) - (b.addedOrder || 0);
    if (orderDifference !== 0) {
      return orderDifference;
    }

    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  return normalizedEntry.sortMode === 'asc' ? sortedItems : sortedItems.reverse();
};

export const reorderQuestions = (entry, questionId, direction) => {
  const normalizedEntry = normalizeQuestionEntry(entry);
  const currentItems = normalizedEntry.sortMode === 'custom'
    ? [...normalizedEntry.items]
    : getSortedQuestions(normalizedEntry);
  const currentIndex = currentItems.findIndex((item) => item.id === questionId);

  if (currentIndex === -1) {
    return normalizedEntry;
  }

  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= currentItems.length) {
    return {
      ...normalizedEntry,
      sortMode: 'custom',
      items: currentItems
    };
  }

  const swappedItems = [...currentItems];
  const [currentItem] = swappedItems.splice(currentIndex, 1);
  swappedItems.splice(nextIndex, 0, currentItem);

  return {
    ...normalizedEntry,
    sortMode: 'custom',
    items: swappedItems
  };
};

export const moveQuestionBefore = (entry, draggedQuestionId, targetQuestionId) => {
  const normalizedEntry = normalizeQuestionEntry(entry);
  const currentItems = normalizedEntry.sortMode === 'custom'
    ? [...normalizedEntry.items]
    : getSortedQuestions(normalizedEntry);
  const draggedIndex = currentItems.findIndex((item) => item.id === draggedQuestionId);
  const targetIndex = currentItems.findIndex((item) => item.id === targetQuestionId);

  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
    return {
      ...normalizedEntry,
      sortMode: 'custom',
      items: currentItems
    };
  }

  const reorderedItems = [...currentItems];
  const [draggedItem] = reorderedItems.splice(draggedIndex, 1);
  const nextTargetIndex = reorderedItems.findIndex((item) => item.id === targetQuestionId);
  reorderedItems.splice(nextTargetIndex, 0, draggedItem);

  return {
    ...normalizedEntry,
    sortMode: 'custom',
    items: reorderedItems
  };
};

export const updateQuestionInEntry = (entry, updatedQuestion) => {
  const normalizedEntry = normalizeQuestionEntry(entry);

  return {
    ...normalizedEntry,
    items: normalizedEntry.items.map((item) => {
      if (item.id !== updatedQuestion.id) {
        return item;
      }

      return normalizeQuestionItem(
        {
          ...item,
          ...updatedQuestion
        },
        item.addedOrder || 0
      );
    }).filter(Boolean)
  };
};

export const removeQuestionFromEntry = (entry, questionId) => {
  const normalizedEntry = normalizeQuestionEntry(entry);

  return {
    ...normalizedEntry,
    items: normalizedEntry.items.filter((item) => item.id !== questionId)
  };
};

export const getQuestionStatsKey = (newsId, questionId) => `${newsId}_${questionId}`;
