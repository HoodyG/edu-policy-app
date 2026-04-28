import { getSortedQuestions } from '../lib/questionUtils';

const QuestionSortManagerModal = ({
  isMobile,
  isOpen,
  sortDraftEntry,
  draggedQuestionId,
  dragOverQuestionId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClose,
  onSave,
  GripIcon
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(13,18,27,0.5)',
      zIndex: 1003,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '760px',
        maxHeight: '82vh',
        overflowY: 'auto',
        background: '#fff',
        borderRadius: '22px',
        padding: isMobile ? '18px' : '22px'
      }} className="soft-scrollbar">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>拖拽排序</h3>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
              拖动右侧三横图标调整顺序，每题只显示一行，方便快速排布。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {getSortedQuestions(sortDraftEntry).map((question, index) => (
            <div
              key={question.id}
              draggable
              onDragStart={() => onDragStart(question.id)}
              onDragOver={(event) => {
                event.preventDefault();
                onDragOver(question.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                onDrop(question.id);
              }}
              onDragEnd={onDragEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '14px',
                border: dragOverQuestionId === question.id ? '1px solid #60a5fa' : '1px solid #e5e7eb',
                background: '#fff',
                cursor: draggedQuestionId === question.id ? 'grabbing' : 'grab'
              }}
            >
              <span style={{
                minWidth: '28px',
                height: '28px',
                borderRadius: '999px',
                background: '#eef2ff',
                color: '#4338ca',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700
              }}>
                {index + 1}
              </span>
              <span style={{
                flex: 1,
                fontSize: '14px',
                color: '#111827',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {question.title || '未识别题干'}
              </span>
              <span style={{
                color: '#64748b',
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <GripIcon />
              </span>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '18px',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={onClose}
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
            onClick={onSave}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            保存顺序
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionSortManagerModal;
