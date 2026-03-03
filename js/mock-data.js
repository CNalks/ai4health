// Mock数据 - 厦门市思明区传染病智能预警平台
const MOCK = {
  // 当前用户
  currentUser: {
    name: '陈志明',
    role: '管理员',
    department: '厦门市思明区疾控中心',
    avatar: 'CZ'
  },

  // 仪表盘KPI
  dashboardKPIs: {
    criticalAlerts: { value: 12, trend: '+2', label: '紧急预警' },
    highRiskWarnings: { value: 48, trend: '-5%', label: '高风险预警' },
    activeTasks: { value: 24, completion: '82%', label: '进行中任务' },
    overdueAlerts: { value: 5, label: '逾期预警' }
  },

  // 思明区街道/社区
  communities: [
    { name: '筼筜街道', zone: 'A-01', type: '流感样病例', risk: 9.2, status: '严重' },
    { name: '中华街道', zone: 'A-02', type: '登革热', risk: 7.8, status: '高风险' },
    { name: '鹭江街道', zone: 'B-01', type: '诺如病毒', risk: 6.5, status: '高风险' },
    { name: '开元街道', zone: 'B-02', type: '手足口病', risk: 5.2, status: '中等' },
    { name: '梧村街道', zone: 'C-01', type: '流感', risk: 4.8, status: '中等' },
    { name: '嘉莲街道', zone: 'C-02', type: '水痘', risk: 3.5, status: '低风险' },
    { name: '莲前街道', zone: 'D-01', type: '肺结核', risk: 3.2, status: '低风险' },
    { name: '鼓浪屿街道', zone: 'D-02', type: '流感样病例', risk: 2.8, status: '低风险' },
    { name: '滨海街道', zone: 'E-01', type: '新冠病毒', risk: 4.1, status: '中等' },
    { name: '厦港街道', zone: 'E-02', type: '登革热', risk: 6.1, status: '高风险' }
  ],

  // 预警中心数据
  warnings: [
    { id: 'WRN-2026-0042', level: '严重', levelClass: 'rose', indicator: '流感样病例聚集',
      area: '筼筜街道-网格04', status: '未解决', statusClass: 'slate', time: '2026-03-03 14:22:10' },
    { id: 'WRN-2026-0041', level: '高风险', levelClass: 'amber', indicator: '登革热布雷图指数超标',
      area: '中华街道-网格02', status: '处理中', statusClass: 'amber', time: '2026-03-03 14:18:05' },
    { id: 'WRN-2026-0040', level: '中等', levelClass: 'yellow', indicator: '诺如病毒校园聚集',
      area: '鹭江街道-网格01', status: '未解决', statusClass: 'slate', time: '2026-03-03 13:55:40' },
    { id: 'WRN-2026-0039', level: '低风险', levelClass: 'blue', indicator: '手足口病季节性升高',
      area: '开元街道-网格03', status: '已确认', statusClass: 'emerald', time: '2026-03-03 09:12:33' },
    { id: 'WRN-2026-0038', level: '严重', levelClass: 'rose', indicator: '不明原因肺炎聚集',
      area: '厦港街道-网格01', status: '未解决', statusClass: 'slate', time: '2026-03-03 08:44:01' }
  ],

  // 任务中心数据
  tasks: [
    { id: 'TSK-2026-0089', region: '筼筜街道，网格#04', disease: '流感预警', diseaseClass: 'red',
      sla: '00:42:15', slaClass: 'red', status: '待派发', statusIcon: 'pending_actions', statusClass: 'amber',
      reported: '12分钟前' },
    { id: 'TSK-2026-0091', region: '中华街道，网格#02', disease: '登革热', diseaseClass: 'blue',
      sla: '04:15:00', slaClass: 'slate', status: '已派发', statusIcon: 'local_shipping', statusClass: 'blue',
      reported: '2小时前' },
    { id: 'TSK-2026-0095', region: '鹭江街道，网格#01', disease: '诺如病毒', diseaseClass: 'orange',
      sla: '01:05:22', slaClass: 'amber', status: '现场核查', statusIcon: 'check_circle', statusClass: 'emerald',
      reported: '4小时前' },
    { id: 'TSK-2026-0097', region: '梧村街道，网格#03', disease: '水痘', diseaseClass: 'blue',
      sla: '06:30:00', slaClass: 'slate', status: '已派发', statusIcon: 'local_shipping', statusClass: 'blue',
      reported: '5小时前' },
    { id: 'TSK-2026-0098', region: '嘉莲街道，网格#02', disease: '手足口病', diseaseClass: 'orange',
      sla: '02:10:15', slaClass: 'amber', status: '待派发', statusIcon: 'pending_actions', statusClass: 'amber',
      reported: '6小时前' }
  ],

  // 任务模板
  taskTemplates: [
    { name: '流感样病例聚集应急响应', type: '应急响应', priority: '高', steps: 8, lastUsed: '2026-02-28', status: '启用' },
    { name: '登革热媒介消杀任务', type: '预防控制', priority: '高', steps: 12, lastUsed: '2026-02-25', status: '启用' },
    { name: '诺如病毒校园消毒流程', type: '消毒处置', priority: '中', steps: 6, lastUsed: '2026-02-20', status: '启用' },
    { name: '手足口病社区宣教', type: '健康教育', priority: '低', steps: 4, lastUsed: '2026-02-15', status: '停用' },
    { name: '不明原因肺炎调查模板', type: '流调排查', priority: '高', steps: 15, lastUsed: '2026-03-01', status: '启用' }
  ],

  // 数据源
  dataSources: [
    { name: '厦门市传染病报告系统', type: 'HL7/API', status: '运行中', statusClass: 'green',
      latency: '12ms', uptime: '99.9%', icon: 'health_and_safety' },
    { name: '思明区医院HIS系统', type: 'FHIR接口', status: '已同步', statusClass: 'green',
      nodes: '8/8', lastSync: '2分钟前', icon: 'local_hospital' },
    { name: '环境监测物联网', type: 'MQTT网关', status: '告警', statusClass: 'orange',
      loss: '1.2%', note: '限流中', icon: 'eco' },
    { name: '人口统计API', type: '批量/SFTP', status: '待机', statusClass: 'slate',
      queue: '0', next: '每日00:00', icon: 'groups' }
  ],

  // 数据质量
  dataQuality: {
    completeness: 94.2,
    accuracy: 97.8,
    timeliness: 91.5,
    consistency: 96.3
  },

  // 模型中心
  models: [
    { name: 'SIR传染病传播模型', version: 'v4.2.1', type: '微分方程模型',
      status: '运行中', statusClass: 'green', lastRun: '2026-03-03 09:42', accuracy: '96%' },
    { name: 'SEIR变异株扩展模型', version: 'v3.1.0', type: '随机模型',
      status: '训练中', statusClass: 'amber', lastRun: '2026-03-03 14:15', accuracy: '45%' },
    { name: '登革热媒介风险评估', version: 'v2.5.3', type: '机器学习',
      status: '运行中', statusClass: 'green', lastRun: '2026-03-02 22:00', accuracy: '89%' },
    { name: '时空聚集性分析模型', version: 'v1.8.0', type: '空间统计',
      status: '已停止', statusClass: 'slate', lastRun: '2026-02-28 06:00', accuracy: '82%' },
    { name: 'AI大模型风险研判', version: 'v1.0.0', type: '深度学习',
      status: '测试中', statusClass: 'blue', lastRun: '2026-03-03 10:30', accuracy: '78%' }
  ],

  // 事件中心
  events: [
    { source: '社交媒体', sourceClass: 'blue', title: '微博报告某小区多人发热',
      detail: '多名居民反映同一小区出现聚集性发热...', time: '12分钟前', hasWarning: true, warningLevel: 'red' },
    { source: '医疗机构', sourceClass: 'emerald', title: '第一医院报告疑似聚集病例',
      detail: '急诊科24小时内收治同一社区5名腹泻患者...', time: '45分钟前', hasWarning: false },
    { source: '新闻媒体', sourceClass: 'amber', title: '厦门日报：某校停课通知',
      detail: '思明区某小学因流感样病例增多临时停课...', time: '1小时前', hasWarning: true, warningLevel: 'amber' },
    { source: '社交媒体', sourceClass: 'blue', title: '居民投诉蚊虫滋生',
      detail: '嘉莲街道某小区居民反映积水蚊虫滋生严重...', time: '3小时前', hasWarning: false }
  ],

  // 审计日志
  auditLogs: [
    { time: '2026-03-03 14:32:11', actor: '陈志明', actorInitials: 'CZ', role: '管理员',
      action: '更新角色权限矩阵：分析师', status: '成功', statusClass: 'green' },
    { time: '2026-03-03 12:05:45', actor: '李雪芬', actorInitials: 'LX', role: '管理员',
      action: '导出月度传染病报告', status: '成功', statusClass: 'green' },
    { time: '2026-03-03 09:15:22', actor: '系统', actorInitials: 'SYS', role: '系统',
      action: '自动备份失败', status: '失败', statusClass: 'red' },
    { time: '2026-03-02 18:44:01', actor: '王建华', actorInitials: 'WJ', role: '分析师',
      action: '修改数据脱敏设置', status: '警告', statusClass: 'yellow' }
  ],

  // 示例报告内容
  sampleReport: {
    title: '厦门市思明区传染病监测月报',
    subtitle: '报告期：2026年2月1日 - 2026年2月28日',
    reportId: 'RPT-2026-0228',
    date: '2026年3月3日',
    sections: [
      {
        title: '一、总体概况',
        content: '2026年2月，思明区共报告法定传染病12种1,284例，较上月下降5.2%，较去年同期上升3.8%。其中甲类传染病0例，乙类传染病428例，丙类传染病856例。无死亡病例报告。'
      },
      {
        title: '二、重点疾病监测',
        content: '流感样病例（ILI）: 门诊ILI%为4.2%，高于基线水平（3.5%），主要集中在筼筜街道和中华街道。\n\n登革热: 本月报告2例输入性登革热病例，布雷图指数监测显示厦港街道和滨海街道部分区域指数偏高。\n\n诺如病毒: 鹭江街道某幼儿园发生一起诺如病毒聚集性疫情，涉及患者15人，已采取消毒措施。'
      },
      {
        title: '三、风险评估',
        content: '当前风险等级：中等偏高\n\n主要风险点：\n1. 流感活动度持续上升，预计3月上旬达到峰值\n2. 春季气温回升，登革热媒介蚊虫密度将逐步增加\n3. 开学季诺如病毒校园传播风险增大'
      }
    ],
    tableData: [
      { grid: '筼筜街道', rate: '12.4/10万', status: '严重', trend: '↑ 4.2%' },
      { grid: '中华街道', rate: '8.7/10万', status: '高风险', trend: '↑ 2.1%' },
      { grid: '鹭江街道', rate: '6.3/10万', status: '中等', trend: '↓ 1.5%' },
      { grid: '开元街道', rate: '3.1/10万', status: '稳定', trend: '↓ 0.8%' },
      { grid: '梧村街道', rate: '2.8/10万', status: '稳定', trend: '→ 0.1%' }
    ]
  }
};
