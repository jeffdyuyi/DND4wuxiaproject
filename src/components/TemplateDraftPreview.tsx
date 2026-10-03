import { Config, type ModuleType } from '../constants';
import { type TemplateDraft } from '../utils/templates';
import { type Item, type MoveItem, type Trait, type ProgressionItem, type EquipmentItem } from '../types';
import { TemplateText } from './TemplateText';
import { TermDisplay } from './TermDisplay';
import { ActionMap } from '../constants';

const fields: Record<ModuleType, [string, string][]> = {
    schools: [['description','门派描述'], ['hpStart','1级生命值'], ['hpPerLvl','每级增加生命'], ['surges','每日自疗次数'], ['armorProf','擅长护甲'], ['weaponProf','擅长武器'], ['defBonus','防御加值'], ['trainedSkills','受训技能']],
    moves: [['cls','所属门派 / 来源'], ['level','威能等级'], ['flavor','意境描述'], ['type','使用频率'], ['action','动作'], ['keywords','关键词'], ['range','范围'], ['trigger','触发'], ['target','目标'], ['att','攻击'], ['def','目标防御'], ['hit','命中'], ['miss','失手'], ['effect','效果'], ['sustain','维持'], ['special','要求 / 特殊规则']],
    roots: [['attributes','属性调整'], ['size','体型'], ['speed','移动速度'], ['vision','视觉'], ['flavor','描述']],
    origins: [['languages','语言'], ['skillBonuses','技能加值'], ['flavor','背景描述']],
    destinies: [['flavor','描述'], ['powerType','类型'], ['action','动作'], ['range','范围'], ['target','目标'], ['effect','效果']],
    feats: [['req','修炼门槛'], ['tier','层级'], ['flavor','描述'], ['benefit','造诣效果']],
    items: [['level','等级'], ['slot','部位'], ['price','价值'], ['type','类型'], ['flavor','外观'], ['enhance','淬炼等级'], ['crit','暴击效果'], ['prop','特性'], ['power','神通']],
    traditions: [['entryLevel','起始等级'], ['flavor','引言 / 意境'], ['req','前提条件'], ['description','资源说明']],
    paths: [['entryLevel','起始等级'], ['flavor','引言 / 意境'], ['req','前提条件'], ['description','资源说明'], ['culminationTitle','终局标题'], ['culmination','终局 / 不朽说明']],
};
function valueOf(item: Item, key: string, module: ModuleType) {
    const value = item[key];
    if (key === 'action') return item.actionLabel || ActionMap[value as keyof typeof ActionMap]?.t || value;
    if (module === 'moves' && key === 'type' && ['basic','special','ultimate'].includes(String(value))) return item.typeLabel || ({ basic: '随意', special: '遭遇', ultimate: '每日' } as Record<string, string>)[String(value)];
    if (key === 'def') return item.defLabel || value;
    return value;
}
function Fields({ item, module }: { item: Item; module: ModuleType }) {
    return <dl className="template-draft-fields">{fields[module].map(([key, label]) => {
        const value = valueOf(item, key, module);
        if ((typeof value !== 'string' && typeof value !== 'number') || value === '') return null;
        return <div key={key} className="template-draft-field"><dt><TermDisplay>{label}</TermDisplay></dt><dd><TemplateText text={String(value)} /></dd></div>;
    })}</dl>;
}
export function TemplateDraftPreview({ draft }: { draft: TemplateDraft }) {
    const { item, module } = draft;
    const features = (module === 'origins' ? item.traits : ['schools', 'traditions', 'paths'].includes(module) ? item.features : undefined) as (Trait & { level?: string })[] | undefined;
    const powers = (module === 'items' || module === 'traditions' || module === 'paths') ? (item as ProgressionItem | EquipmentItem).powers : undefined;
    const versions = module === 'items' ? (item as EquipmentItem).versions : undefined;
    const rules = module === 'moves' ? (item as MoveItem).rules : undefined;
    return <article className="template-draft-preview" aria-label={`导入后编辑内容：${item.name}`}>
        <div className="template-draft-heading"><h3><TermDisplay>{item.name}</TermDisplay></h3><span>{Config[module].title}</span></div>
        <Fields item={item} module={module} />
        {!!versions?.length && <section className="template-draft-section">
            <h4>等级版本 <small>{versions.length} 项</small></h4>
            {versions.map(version => <section className="template-draft-feature" key={version.id}>
                <h5>{version.level}级版本</h5>
                <dl className="template-draft-fields">
                    {([['价值', version.price], ['淬炼', version.enhance], ['暴击', version.crit]] as const)
                        .filter(([, value]) => value)
                        .map(([label, value]) => <div className="template-draft-field" key={label}>
                            <dt>{label}</dt><dd><TemplateText text={value} /></dd>
                        </div>)}
                </dl>
            </section>)}
        </section>}
        {!!features?.length && <section className="template-draft-section"><h4>{module === 'schools' ? '门派特技' : module === 'origins' ? '出身特性' : '分级特性'} <small>{features.length} 项</small></h4>{features.map((feature, index) => <section className="template-draft-feature" key={feature.id}><h5><span className="template-feature-number">{index + 1}</span><TermDisplay>{feature.name || '未命名特性'}</TermDisplay>{feature.level !== undefined && <small>{feature.level}级获得</small>}</h5><TemplateText text={feature.desc} /></section>)}</section>}
        {!!rules?.length && <section className="template-draft-section"><h4>附加规则段</h4>{rules.map(rule => <section className="template-draft-feature" key={rule.id}><h5><TermDisplay>{rule.title}</TermDisplay></h5><TemplateText text={rule.text} /></section>)}</section>}
        {!!powers?.length && <section className="template-draft-section"><h4>附属招式 <small>{powers.length} 项</small></h4>{powers.map(power => <details className="template-draft-power" key={power.id}><summary><TermDisplay>{power.name || '未命名招式'}</TermDisplay><small>{power.acquiredLevel || power.level}级获得</small></summary><Fields item={power} module="moves" />{!!power.rules?.length && power.rules.map(rule => <section className="template-draft-feature" key={rule.id}><h5>{rule.title}</h5><TemplateText text={rule.text} /></section>)}</details>)}</section>}
        {item.source && <p className="template-draft-source">来源：{item.source}</p>}
    </article>;
}
