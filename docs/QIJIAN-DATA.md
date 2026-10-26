# 栖间本地数据与扩展

内部统一使用厘米、角度；Three.js 在渲染边界换算成米。二维、三维、规则、保存与报告共用项目数据。

## 项目 schema 2

```text
project
  format: qijian
  schemaVersion: 2
  id / name / createdAt / updatedAt / revision
  needs
    residents / members[] / purposes[] / entries[]
    preferredStyle / notes / revision
  schemes[]
    id / name / notes / pending[] / protected
    geometry: zones[] / items[] / structures[] / dimensions[] / backgroundPlan / wallHeight
      automaticWalls: false 时使用显式墙体（可用于手工墙段与迁移）
    groups[]: id / name / itemIds[] / allowInternalOverlap
    rules[]
    check: revision / needsRevision / checkedAt / results[] / stale
  activeSchemeId
  styles[]: id / name / floor / wall / wood / fabric / accent
  activeStyleId
  walk: eyeHeight / speed / hfov / radius
```

需求条目支持 `text / kind / priority / ruleId`，保留家具条目另含尺寸及 `objectId`，调整约束使用 `constraint`。无规则关联的文字保持人工待确认；优先级为“待确认”的条目也不会因几何结果自动成为满足。

家具沿用上游中心坐标 `x/y` 与 `width/depth/height/rotation/elevation`，增加分类、材质说明、尺寸依据、确认状态和备注。`mattress` 单独表达床垫尺寸；`collision` 可覆盖碰撞外径；`stateOffset` 使用家具本地坐标表达状态位移；`useSpace` 表达四向预留及适用状态。所有组合成员仍是普通家具对象，组合变换不会把 L 形凹区变成实体。

多边形空间沿用上游的原点加局部 `points[]` 结构。角点、边长和空间尺寸修改通过统一几何层校验；附着开口在空间变形后重投影。手动门窗允许吸附到最近可容纳的墙边。

## 规则

- `overlap`：旋转矩形 SAT 与高度区间；组合内部装配交叠默认仍检查，只有明确设置时才忽略。
- `bounds`：多边形覆盖面积与空间高度。
- `clearance`：`objectA / objectB / threshold`，最小外形距离。
- `usage`：当前适用使用预留及门扇近似扫掠对其他对象的冲突。
- `path`：`start / end / threshold / gridStep / includeUsage / roomId`。阈值是包络直径，网格 1–20 厘米，并采用保守半格余量。
- `visibility`：`eye / eyeHeight / targetHeight / threshold`，目标可以是 `targetId` 或 `targetMode: area` 加 `targetArea` 的矩形区域。

结果包含当前值、目标值、条件、关联对象、定位位置及状态。缺失依赖保持待确认；未知类型或范围过大显示暂不支持。检查缓存绑定项目及需求版本，编辑后失效，导入文件中的结果必须重新计算。

## 迁移与持久化

schema 1→2 补充缺省需求数组、组合、规则、材质风格与漫游参数，并保留旧字段。高于当前版本拒绝导入，避免丢失未知数据。Room Studio schema 1–4 经上游读取层进入统一模型，A/B 标签、说明、后续事项与底图被保留，尺寸依据默认待复核。

IndexedDB 原子事务同时保存当前项目与上一份恢复副本。项目文件携带自己的底图；完整备份包含全部项目和个人模板。恢复预先验证所有数据后在单次事务中写入，新项目 ID 防止覆盖已有记录。

规则是少量明确类型及参数，不执行脚本，不采用动态规则语言。新增规则应扩展 `rules.js` 与条件表单，并验证不支持、缺失数据和未确认尺寸分支。
