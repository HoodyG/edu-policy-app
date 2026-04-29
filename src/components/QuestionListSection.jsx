import { getQuestionStatsKey } from '../lib/questionUtils';

import { useLayoutEffect } from 'react';

const QuestionListSection = ({
  currentQuestions,
  fullScreenNews,
  userAnswers,
  submittedAnswers,
  questionStats,
  getQuestionPerformance,
  isMobile,
  firstQuestionCardRef,
  handleOpenQuestionEditor,
  handleDeleteQuestion,
  handleQuestionChoice,
  optionNoteEditor,
  optionNotePreview,
  hoveredOptionKey,
  setHoveredOptionKey,
  openOptionNoteEditor,
  closeOptionNoteEditor,
  handleSaveOptionNote,
  handleDeleteOptionNote,
  setOptionNotePreview,
  setIsOptionListMenuOpen,
  isOptionListMenuOpen,
  syncEditorHtml,
  handleEditorCompositionStart,
  handleEditorCompositionEnd,
  applyRichTextCommand,
  optionNoteEditorRef,
  handleRetryQuestion,
  normalizeRichText,
  BoldIcon,
  NoteIcon,
  PlusIcon,
  UnorderedListIcon
}) => {
  useLayoutEffect(() => {
    if (!optionNoteEditor.questionId || !optionNoteEditorRef.current) {
      return;
    }

    if (document.activeElement === optionNoteEditorRef.current) {
      return;
    }

    const nextHtml = optionNoteEditor.text || '';
    if (optionNoteEditorRef.current.innerHTML !== nextHtml) {
      optionNoteEditorRef.current.innerHTML = nextHtml;
    }
  }, [optionNoteEditor.questionId, optionNoteEditor.optionLetter, optionNoteEditor.text, optionNoteEditorRef]);

  if (currentQuestions.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {currentQuestions.map((question, index) => {
        const statsKey = getQuestionStatsKey(fullScreenNews.id, question.id);
        const selectedAnswer = userAnswers[statsKey] || '';
        const isSubmitted = Boolean(submittedAnswers[statsKey]);
        const performance = getQuestionPerformance(questionStats, fullScreenNews.id, question.id);
        const isCorrect = isSubmitted && question.answer && selectedAnswer === question.answer;

        return (
          <div
            key={question.id}
            ref={index === 0 ? firstQuestionCardRef : null}
            style={{
              background: '#fff',
              border: '1px solid #dce5ef',
              borderRadius: '18px',
              padding: isMobile ? '14px' : '16px 18px',
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '14px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                <span
                  style={{
                    minWidth: '30px',
                    height: '30px',
                    borderRadius: '999px',
                    background: '#ecf3ff',
                    color: '#2563eb',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                >
                  {index + 1}
                </span>
                <div
                  style={{
                    flex: 1,
                    fontSize: '15px',
                    lineHeight: 1.8,
                    color: '#1f2937',
                    fontWeight: 600
                  }}
                >
                  {question.title || '未识别题干'}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  flexDirection: 'column',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="button"
                  onClick={() => handleOpenQuestionEditor(question)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '10px',
                    border: '1px solid #d0d7e2',
                    background: '#fff',
                    color: '#475569',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(question.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '10px',
                    border: '1px solid #fecaca',
                    background: '#fff5f5',
                    color: '#dc2626',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  删除
                </button>
              </div>
            </div>

            {question.options.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {question.options.map((option) => {
                  const isSelected = selectedAnswer === option.letter;
                  const isCorrectOption = isSubmitted && question.answer === option.letter;
                  const isWrongSelected = isSubmitted && isSelected && question.answer && question.answer !== option.letter;
                  const optionNote = question.optionNotes?.[option.letter] || '';
                  const optionKey = `${question.id}_${option.letter}`;
                  const isEditingOptionNote =
                    optionNoteEditor.questionId === question.id && optionNoteEditor.optionLetter === option.letter;
                  const showOptionNoteAction =
                    isSubmitted && !optionNote && (isMobile || hoveredOptionKey === optionKey || isEditingOptionNote);
                  const isPreviewOpen =
                    optionNotePreview.questionId === question.id && optionNotePreview.optionLetter === option.letter;

                  return (
                    <div
                      key={`${question.id}_${option.letter}`}
                      onMouseEnter={() => setHoveredOptionKey(optionKey)}
                      onMouseLeave={() => setHoveredOptionKey((prev) => (prev === optionKey ? '' : prev))}
                      style={{
                        position: 'relative'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleQuestionChoice(question, option.letter)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: isSubmitted && optionNote ? '12px 48px 12px 14px' : '12px 14px',
                          borderRadius: '14px',
                          border: `1px solid ${
                            isCorrectOption
                              ? '#22c55e'
                              : isWrongSelected
                                ? '#ef4444'
                                : isSelected
                                  ? '#2563eb'
                                  : '#d6dde8'
                          }`,
                          background: isCorrectOption
                            ? '#f0fdf4'
                            : isWrongSelected
                              ? '#fef2f2'
                              : isSelected
                                ? '#eff6ff'
                                : '#fff',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: isSubmitted ? 'default' : 'pointer',
                          lineHeight: 1.7,
                          position: 'relative'
                        }}
                      >
                        <span
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '999px',
                            border: `1px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                            background: isSelected ? '#2563eb' : '#fff',
                            color: isSelected ? '#fff' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            marginTop: '1px',
                            flexShrink: 0
                          }}
                        >
                          {option.letter}
                        </span>
                        <span style={{ flex: 1 }}>{option.text}</span>
                      </button>
                      {isSubmitted && optionNote && (
                        <button
                          type="button"
                          onMouseEnter={() => {
                            setOptionNotePreview({ questionId: question.id, optionLetter: option.letter });
                          }}
                          onMouseLeave={() => {
                            if (!isEditingOptionNote) {
                              setOptionNotePreview((prev) =>
                                prev.questionId === question.id && prev.optionLetter === option.letter
                                  ? { questionId: '', optionLetter: '' }
                                  : prev
                              );
                            }
                          }}
                          onTouchStart={() => {
                            setOptionNotePreview({ questionId: question.id, optionLetter: option.letter });
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            openOptionNoteEditor(question, option.letter);
                          }}
                          title={`点击可编辑 ${option.letter} 选项笔记`}
                          data-popup-layer="true"
                          style={{
                            position: 'absolute',
                            top: '50%',
                            right: '12px',
                            transform: 'translateY(-50%)',
                            width: '24px',
                            height: '24px',
                            borderRadius: '999px',
                            border: 'none',
                            background: '#eff6ff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#1d4ed8',
                            cursor: 'pointer',
                            zIndex: 2
                          }}
                        >
                          <NoteIcon size={14} color="#1d4ed8" />
                        </button>
                      )}
                      {isSubmitted && !optionNote && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openOptionNoteEditor(question, option.letter);
                          }}
                          title={`添加 ${option.letter} 选项笔记`}
                          data-popup-layer="true"
                          style={{
                            position: 'absolute',
                            top: '50%',
                            right: isMobile ? '-2px' : '-12px',
                            transform: 'translateY(-50%)',
                            width: '26px',
                            height: '26px',
                            borderRadius: '999px',
                            border: '1px solid #dbe4ef',
                            background: '#fff',
                            color: '#2563eb',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 8px 16px rgba(15,23,42,0.12)',
                            opacity: showOptionNoteAction ? 1 : 0,
                            pointerEvents: showOptionNoteAction ? 'auto' : 'none',
                            transition: 'opacity 0.18s ease'
                          }}
                        >
                          <PlusIcon size={14} color="#2563eb" />
                        </button>
                      )}
                      {isPreviewOpen && optionNote && (
                        <div
                          data-popup-layer="true"
                          style={{
                            position: 'absolute',
                            top: isMobile ? 'calc(100% + 8px)' : '50%',
                            right: isMobile ? 0 : '38px',
                            transform: isMobile ? 'none' : 'translateY(-50%)',
                            width: isMobile ? '100%' : '260px',
                            padding: '12px 14px',
                            borderRadius: '14px',
                            border: '1px solid #dbe4ef',
                            background: '#fffdf6',
                            boxShadow: '0 18px 36px rgba(15,23,42,0.12)',
                            zIndex: 12
                          }}
                        >
                          <div
                            className="rich-note-content"
                            style={{ color: '#475569', fontSize: '13px', lineHeight: 1.8 }}
                            dangerouslySetInnerHTML={{ __html: normalizeRichText(optionNote) }}
                          />
                        </div>
                      )}
                      {isEditingOptionNote && (
                        <div
                          data-popup-layer="true"
                          style={{
                            position: 'absolute',
                            top: isMobile ? 'calc(100% + 8px)' : '50%',
                            right: isMobile ? 0 : '38px',
                            transform: isMobile ? 'none' : 'translateY(-50%)',
                            width: isMobile ? '100%' : '320px',
                            padding: '14px',
                            borderRadius: '16px',
                            border: '1px solid #dbe4ef',
                            background: '#fffaf0',
                            boxShadow: '0 18px 36px rgba(15,23,42,0.14)',
                            zIndex: 14
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              marginBottom: '10px'
                            }}
                          >
                            <strong style={{ fontSize: '14px', color: '#1f2937' }}>
                              选项 {optionNoteEditor.optionLetter} 笔记
                            </strong>
                            <div
                              style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                              data-popup-layer="true"
                            >
                              <button
                                type="button"
                                onClick={() => applyRichTextCommand('option', 'bold')}
                                title="加粗选中文本"
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '10px',
                                  border: '1px solid #d0d7e2',
                                  background: '#fff',
                                  color: '#334155',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <BoldIcon size={16} color="#334155" />
                              </button>
                              <div style={{ position: 'relative' }} data-popup-layer="true">
                                <button
                                  type="button"
                                  onClick={() => setIsOptionListMenuOpen((prev) => !prev)}
                                  title="列表样式"
                                  style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '10px',
                                    border: '1px solid #d0d7e2',
                                    background: '#fff',
                                    color: '#334155',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <UnorderedListIcon size={16} color="#334155" />
                                </button>
                                {isOptionListMenuOpen && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '40px',
                                      right: 0,
                                      minWidth: '126px',
                                      padding: '8px',
                                      borderRadius: '12px',
                                      border: '1px solid #dbe4ef',
                                      background: '#fff',
                                      boxShadow: '0 16px 32px rgba(15,23,42,0.12)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px',
                                      zIndex: 20
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        applyRichTextCommand('option', 'insertUnorderedList');
                                        setIsOptionListMenuOpen(false);
                                      }}
                                      style={{
                                        padding: '8px 10px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: '#fff',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        color: '#475569'
                                      }}
                                    >
                                      · 点列表
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        applyRichTextCommand('option', 'insertOrderedList');
                                        setIsOptionListMenuOpen(false);
                                      }}
                                      style={{
                                        padding: '8px 10px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: '#fff',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        color: '#475569'
                                      }}
                                    >
                                      1. 数字列表
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div
                            ref={optionNoteEditorRef}
                            className="rich-note-editor"
                            contentEditable
                            suppressContentEditableWarning
                            onInput={() => syncEditorHtml('option')}
                            onCompositionStart={() => handleEditorCompositionStart('option')}
                            onCompositionEnd={() => handleEditorCompositionEnd('option')}
                            style={{
                              width: '100%',
                              minHeight: '120px',
                              padding: '12px',
                              borderRadius: '12px',
                              border: '1px solid #d0d7e2',
                              fontSize: '13px',
                              lineHeight: 1.8,
                              fontFamily: 'inherit',
                              background: '#fff',
                              outline: 'none'
                            }}
                          />
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: '10px',
                              marginTop: '10px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={closeOptionNoteEditor}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '10px',
                                  border: '1px solid #d0d7e2',
                                  background: '#fff',
                                  color: '#475569',
                                  cursor: 'pointer'
                                }}
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveOptionNote}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: '#2563eb',
                                  color: '#fff',
                                  cursor: 'pointer'
                                }}
                              >
                                保存
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleDeleteOptionNote}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1px solid #fecaca',
                                background: '#fff5f5',
                                color: '#dc2626',
                                cursor: 'pointer'
                              }}
                            >
                              删除笔记
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isSubmitted && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      marginTop: '6px'
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: isCorrect ? '#f0fdf4' : '#fff7ed',
                        border: `1px solid ${isCorrect ? '#86efac' : '#fed7aa'}`,
                        color: '#334155',
                        fontSize: '14px',
                        lineHeight: 1.8
                      }}
                    >
                      <div>
                        <strong>正确答案：</strong>
                        {question.answer || '未识别'}
                      </div>
                      {question.explanation && (
                        <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                          <strong>解析：</strong>
                          {question.explanation}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleRetryQuestion(question)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '12px',
                          border: '1px solid #d0d7e2',
                          background: '#fff',
                          color: '#475569',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        再做一次
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '14px',
                  lineHeight: 1.8
                }}
              >
                当前题目没有识别到标准选项，请回到“编辑题目”里补充 A/B/C/D 选项和答案。
              </div>
            )}
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center'
              }}
            >
              {performance.attempts > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: '#f0fdf4',
                      color: '#15803d',
                      fontSize: '12px',
                      border: '1px solid #dcfce7'
                    }}
                  >
                    正确率 {performance.accuracy}%
                  </span>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: '#f8fafc',
                      color: '#64748b',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    作答 {performance.attempts} 次
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuestionListSection;
