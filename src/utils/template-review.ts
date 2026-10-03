export function reviewTarget(warning: string) {
    if (/^使用频率/.test(warning)) return 'frequency';
    if (/^动作/.test(warning)) return 'action';
    if (/^原版未给出单一数字等级/.test(warning)) return 'level';
    if (/^攻击表达式/.test(warning)) return 'attack';
    if (/^(规则表格|含嵌套|规则中包含)/.test(warning)) return 'rules';
    if (/^已按原版标题拆分/.test(warning)) return 'features';
    if (/^(未识别明确的职业特性|职业概要已转换)/.test(warning)) return 'description';
    return 'original';
}
