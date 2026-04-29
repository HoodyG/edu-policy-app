import { useLayoutEffect } from 'react';

const NoteSection = ({
  hasNote,
  isNoteEditing,
  isMobile,
  noteSectionRef,
  setIsQuestionEditing,
  setEditingQuestionId,
  setIsSortManagerOpen,
  setIsNoteEditing,
  applyRichTextCommand,
  setIsMainListMenuOpen,
  isMainListMenuOpen,
  noteEditorRef,
  syncEditorHtml,
  handleEditorCompositionStart,
  handleEditorCompositionEnd,
  handleAutoSaveNote,
  noteContent,
  handleDeleteNote,
  handleCancelNote,
  handleSaveNote,
  notes,
  fullScreenNews,
  normalizeRichText,
  BoldIcon,
  UnorderedListIcon
}) => {
  useLayoutEffect(() => {
    if (!isNoteEditing || !noteEditorRef.current) {
      return;
    }

    if (document.activeElement === noteEditorRef.current) {
      return;
    }

    const nextHtml = noteContent || '';
    if (noteEditorRef.current.innerHTML !== nextHtml) {
      noteEditorRef.current.innerHTML = nextHtml;
    }
  }, [isNoteEditing, noteContent, noteEditorRef]);

  if (!hasNote && !isNoteEditing) {
    return null;
  }

  return (
    <section
      ref={noteSectionRef}
      style={{
        order: 1,
        marginBottom: 0,
        padding: isMobile ? '16px' : '18px',
        background: 'linear-gradient(135deg, #fff6dc 0%, #fffaf0 100%)',
        border: '1px solid #f5d58d',
        borderRadius: '18px',
        cursor: isNoteEditing ? 'default' : 'pointer'
      }}
      onClick={() => {
        if (!isNoteEditing) {
          setIsQuestionEditing(false);
          setEditingQuestionId('');
          setIsSortManagerOpen(false);
          setIsNoteEditing(true);
        }
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#1f2937' }}>我的笔记</h3>

      {isNoteEditing ? (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginBottom: '10px',
              flexWrap: 'wrap'
            }}
            data-popup-layer="true"
          >
            <button
              type="button"
              onClick={() => applyRichTextCommand('main', 'bold')}
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
                onClick={() => setIsMainListMenuOpen((prev) => !prev)}
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
              {isMainListMenuOpen && (
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
                      applyRichTextCommand('main', 'insertUnorderedList');
                      setIsMainListMenuOpen(false);
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
                      applyRichTextCommand('main', 'insertOrderedList');
                      setIsMainListMenuOpen(false);
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
          <div
            ref={noteEditorRef}
            className="rich-note-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={() => syncEditorHtml('main')}
            onCompositionStart={() => handleEditorCompositionStart('main')}
            onCompositionEnd={() => handleEditorCompositionEnd('main')}
            onBlur={() => {
              setTimeout(() => {
                if (noteSectionRef.current?.contains(document.activeElement)) {
                  return;
                }

                handleAutoSaveNote();
              }, 0);
            }}
            style={{
              width: '100%',
              minHeight: isMobile ? '150px' : '180px',
              padding: '14px',
              borderRadius: '14px',
              border: '1px solid #d6dde8',
              fontSize: '14px',
              lineHeight: 1.8,
              fontFamily: 'inherit',
              background: '#fffef8',
              outline: 'none'
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '10px',
              marginTop: '12px',
              flexWrap: 'wrap'
            }}
          >
            <button
              type="button"
              onClick={handleDeleteNote}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                background: '#fff5f5',
                color: '#dc2626',
                cursor: 'pointer'
              }}
            >
              删除笔记
            </button>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCancelNote}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
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
                onClick={handleSaveNote}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#c41e3a',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                保存笔记
              </button>
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            color: '#46505a',
            fontSize: '14px',
            lineHeight: 1.9
          }}
          className="rich-note-content"
          dangerouslySetInnerHTML={{ __html: normalizeRichText(notes[fullScreenNews.id]) }}
        />
      )}
    </section>
  );
};

export default NoteSection;
