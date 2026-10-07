// 探索等级与成就

export const LEVELS = [
  { xp: 0, name: '潜水新手' },
  { xp: 600, name: '海洋观察员' },
  { xp: 2500, name: '鱼类研究者' },
  { xp: 7000, name: '深海探索者' },
  { xp: 16000, name: '海洋专家' },
  { xp: 36000, name: '世界鱼类学者' },
  { xp: 70000, name: '深渊探索大师' },
]

export function levelOf(xp: number) {
  let i = 0
  for (let k = 0; k < LEVELS.length; k++) if (xp >= LEVELS[k].xp) i = k
  const next = LEVELS[i + 1]
  return {
    index: i,
    level: i + 1,
    name: LEVELS[i].name,
    cur: LEVELS[i].xp,
    next: next ? next.xp : null,
    progress: next ? (xp - LEVELS[i].xp) / (next.xp - LEVELS[i].xp) : 1,
  }
}

export interface AchievementDef {
  id: string
  name: string
  desc: string
  icon: string
  reward: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_dive', name: '初次下水', desc: '第一次跳入海洋。', icon: '🌊', reward: 50 },
  { id: 'first_fish', name: '第一条鱼', desc: '捕获第一条鱼。', icon: '🐟', reward: 100 },
  { id: 'species_10', name: '图鉴入门', desc: '发现 10 种鱼。', icon: '📗', reward: 300 },
  { id: 'species_50', name: '热心收藏家', desc: '发现 50 种鱼。', icon: '📘', reward: 2000 },
  { id: 'species_100', name: '小小鱼类学家', desc: '发现 100 种鱼。', icon: '📙', reward: 8000 },
  { id: 'species_200', name: '博物学者', desc: '发现 200 种鱼。', icon: '📚', reward: 30000 },
  { id: 'species_1000', name: '海洋学者', desc: '发现 1000 种鱼。', icon: '🎓', reward: 100000 },
  { id: 'species_5000', name: '世界收藏家', desc: '发现 5000 种鱼。', icon: '🌍', reward: 500000 },
  { id: 'depth_200', name: '暮光入口', desc: '到达 200m。', icon: '🌒', reward: 500 },
  { id: 'depth_1000', name: '深海居民', desc: '到达 1000m。', icon: '🌑', reward: 3000 },
  { id: 'depth_4000', name: '黑暗世界', desc: '到达 4000m。', icon: '⚫', reward: 12000 },
  { id: 'depth_6000', name: '深渊来客', desc: '到达 6000m。', icon: '🕳️', reward: 30000 },
  { id: 'depth_trench', name: '地球最深处', desc: '抵达超深海沟底部（10800m+）。', icon: '🏔️', reward: 100000 },
  { id: 'super_school', name: '百万鱼群', desc: '遇到超级鱼群事件。', icon: '🐠', reward: 1500 },
  { id: 'miracle', name: '海洋奇迹', desc: '发现传奇或极难发现的物种。', icon: '🌟', reward: 5000 },
  { id: 'first_wreck', name: '沉船猎人', desc: '发现第一艘沉船。', icon: '⚓', reward: 400 },
  { id: 'first_cave', name: '洞穴探险家', desc: '进入一个海底洞穴。', icon: '🕯️', reward: 400 },
  { id: 'whale_fall', name: '鲸落见证者', desc: '发现极其罕见的鲸落。', icon: '🐋', reward: 8000 },
  { id: 'vent', name: '热泉之子', desc: '发现深海热液喷口。', icon: '♨️', reward: 3000 },
  { id: 'record', name: '纪录打破者', desc: '捕获一条纪录级个体。', icon: '🏆', reward: 1000 },
  { id: 'rich', name: '小富翁', desc: '累计赚取 $100,000。', icon: '💰', reward: 5000 },
  { id: 'all_regions', name: '环游世界', desc: '发现全部 11 种海域。', icon: '🗺️', reward: 50000 },
  { id: 'night_dive', name: '夜潜者', desc: '在夜间潜水。', icon: '🌙', reward: 200 },
  { id: 'photo_10', name: '水下摄影师', desc: '拍摄 10 种鱼。', icon: '📷', reward: 2000 },
  { id: 'polar', name: '冰海潜行', desc: '进入极地海域。', icon: '🧊', reward: 2000 },
  { id: 'storm_dive', name: '风暴中的潜水员', desc: '在雷暴天气下潜。', icon: '⛈️', reward: 500 },
  { id: 'full_bag', name: '满载而归', desc: '背包装满后返回船上。', icon: '🎒', reward: 300 },
]

export const COLLECTIBLES: { id: string; name: string; icon: string; desc: string; value: number }[] = [
  { id: 'compass', name: '黄铜罗盘', icon: '🧭', desc: '指针依然指向北方。', value: 800 },
  { id: 'pocket_watch', name: '旧怀表', icon: '⌚', desc: '停在了沉没的那一刻。', value: 1200 },
  { id: 'ship_bell', name: '船钟', icon: '🔔', desc: '刻着一艘无名船只的名字。', value: 2500 },
  { id: 'amphora', name: '古代双耳陶罐', icon: '🏺', desc: '可能来自两千年前的地中海商船。', value: 4000 },
  { id: 'gold_coin', name: '西班牙金币', icon: '🪙', desc: '“八里亚尔”银币的金色亲戚。', value: 3000 },
  { id: 'spyglass', name: '单筒望远镜', icon: '🔭', desc: '镜片上长满了藤壶。', value: 1500 },
  { id: 'pearl', name: '黑珍珠', icon: '⚫', desc: '在一枚巨大的砗磲中发现。', value: 6000 },
  { id: 'ammonite', name: '菊石化石', icon: '🐚', desc: '来自远古海洋的螺旋。', value: 2200 },
  { id: 'helmet', name: '老式潜水头盔', icon: '⛑️', desc: '前辈潜水员的遗物。', value: 5000 },
  { id: 'bottle', name: '漂流瓶', icon: '🍾', desc: '里面的信已经无法辨认。', value: 300 },
  { id: 'propeller', name: '飞机螺旋桨', icon: '✈️', desc: '二战时期飞机残骸的一部分。', value: 3500 },
  { id: 'manganese', name: '锰结核', icon: '🪨', desc: '深海平原上缓慢生长了百万年。', value: 1800 },
  { id: 'black_smoker', name: '黑烟囱矿物', icon: '🌋', desc: '热液喷口沉积的硫化物晶体。', value: 4500 },
  { id: 'trench_sample', name: '海沟沉积物样本', icon: '🧪', desc: '来自地球最深处的泥土。', value: 20000 },
  { id: 'whale_bone', name: '鲸骨', icon: '🦴', desc: '鲸落生态系统的基石。', value: 7000 },
]
