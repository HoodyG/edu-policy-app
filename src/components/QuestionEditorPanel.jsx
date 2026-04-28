const QuestionEditorPanel = ({
  isMobile,
  editingQuestionId,
  questionDraft,
  questionTextareaRef,
  onChangeDraft,
  onCancel,
  onSave
}) => (
  <div style={{
    marginBottom: '18px',
    padding: isMobile ? '14px' : '16px',
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid #dbe4ef'
  }}>
    <h4 style={{ margin: '0 0 10px', fontSize: '16px', color: '#1f2937' }}>
      {editingQuestionId ? '编辑题目' : '添加题目'}
    </h4>
    <textarea
      ref={questionTextareaRef}
      value={questionDraft}
      onChange={(event) => onChangeDraft(event.target.value)}
      placeholder={'示例：\n**【教育时政单选题】**\n2026年4月，教育部等五部门联合印发了《“人工智能+教育”行动计划》。关于基础教育阶段课程实施要求，正确的是（ ）。\nA. 仅在高中阶段开设选修课程\nB. 纳入地方课程体系并开齐开足开好课程\nC. 只在课后服务中开展\nD. 主要用于竞赛选拔\n【答案】B\n【解析】基础教育阶段要求纳入地方课程体系，重在激发好奇心与培养创新思维。'}
      style={{
        width: '100%',
        minHeight: isMobile ? '220px' : '260px',
        padding: '14px',
        borderRadius: '14px',
        border: '1px solid #d0d7e2',
        fontSize: '14px',
        lineHeight: 1.8,
        resize: 'vertical',
        fontFamily: 'inherit'
      }}
    />
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '12px',
      flexWrap: 'wrap'
    }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: '10px 16px',
          borderRadius: '12px',
          border: '1px solid #d0d7e2',
          background: '#fff',
          color: '#475569',
          fontSize: '14px',
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
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        保存题目
      </button>
    </div>
  </div>
);

export default QuestionEditorPanel;
