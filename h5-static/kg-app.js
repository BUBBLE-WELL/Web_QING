(function () {
  "use strict";

  var STATIC_MESSAGES = {
    user_hi: { en: "Hi.", zh: "嗨。" },
    assistant_intro: {
      en: "Hi. I'm Cui Wanqing. I study the gap between models and the lived world: how data, tools, workflows, maps, labels, and more influence how physical space and places are perceived.",
      zh: "嗨，我是崔莞青。我感兴趣的方向是：模型和真实世界之间的差异。也就是数据、工具、工作流、地图、标签体系——它们如何影响人与系统对空间和地方的感知。"
    }
  };

  var LANDING_TEXTS = {
    "sys-line": { en: "spatial data / platform governance / design", zh: "空间数据 / 平台治理 / 设计" },
    "hero-sub": { en: "Where I started: What does a map miss? Why?", zh: "起点：地图平台忽略了什么？为什么？" },
    "say-hi": { en: "say Hi", zh: "打招呼" },
    "workshop-skip": { en: "or, jump to the AI workshop →", zh: "直接进入 AI Agent 工作坊 →" }
  };

  var TAG_HINTS_EN = {
    All: "show every validated project",
    "#spatial_data": "where location changes the answer",
    "#embedding": "comparing meanings with vectors",
    "#data_quality": "defaults and errors that change decisions",
    "#platform_governance": "search, map, and product risk",
    "#geoai": "AI systems with place-specific risk",
    "#ethics": "accountability and contestability",
    "#taxonomy": "naming systems and labels",
    "#planning_design": "earlier planning and design work",
    "#visualization": "BIM and Twinmotion visual communication"
  };
  var TAG_HINTS_ZH = {
    All: "全部项目",
    "#spatial_data": "空间/位置/地方如何改变分析结论",
    "#embedding": "用向量比较含义/语义",
    "#data_quality": "数据来源、数据质量，如何影响模型和决策",
    "#platform_governance": "搜索、地图与产品风险",
    "#geoai": "带地点风险的 AI 系统",
    "#ethics": "问责与可争辩性，相关政策与研究",
    "#taxonomy": "命名与标签体系",
    "#planning_design": "从GIS，实地调查，政策分析到规划设计",
    "#visualization": "BIM 与 Twinmotion，PS，视觉表达 "
  };

  var CASES = [
    {
      id: "maup",
      category: "analytics",
      iconKey: "map",
      title: "MAUP / UGCoP",
      kicker: "spatial uncertainty",
      story: "One default buffer radius shifted the hawker-to-chain ratio for 165 planning units, reclassifying them from hawker-rich to hawker-poor. The point is not that food access changed — the classification itself depends on scale. Singapore's Master Plan uses these same zoning boundaries, so a scale choice made for data convenience can quietly rewrite who counts as underserved in policy.",
      evidence: "Reproducible notebook pipeline: three MAUP grids (500m/1000m/2000m), two UGCoP buffers (500m/1000m), plus an admin-level zoning sensitivity test using Singapore Master Plan boundaries.",
      highlights: ["poor-unit share: 76.3% -> 55.9%", "reclassified planning units: 165", "default scale choice becomes data quality risk", "multi-scale parameter sweep", "hawker vs. chain sensitivity"],
      proof: [
        ["poor-unit share", "76.3% -> 55.9%"],
        ["reclassified units", "165"],
        ["grid median contrast", "1.000 vs 0.692"],
        ["grid sizes compared", "500 m / 1000 m / 2000 m"],
        ["zoning effect", "Planning Area vs Subzone"]
      ],
      analyticsMeta: [
        ["method", "MAUP + UGCoP parameter sweep"],
        ["spatial scales", "500 m / 1000 m / 2000 m grids + buffers"],
        ["reclassified units", "165 planning units"],
        ["reproducibility", "notebook pipeline with reusable outputs"]
      ],
      tags: ["#spatial_data", "#data_quality", "#ethics"],
      demo: "maup",
      kicker_zh: "空间不确定性",
      story_zh:"默认缓冲半径一改，165 个规划单元的小贩/连锁比例被重新分类，从「小贩丰富」掉进「小贩稀少」。关键不是食物供给变了，而是分类标准本身就依赖尺度。新加坡总体规划沿用同样的行政边界——在数据分析里随手选的尺度，会悄悄改写政策里谁算弱势。",
      evidence_zh: "可复现 notebook：三条 MAUP 网格（500 m / 1000 m / 2000 m），两条 UGCoP 缓冲（500 m / 1000 m），再加一层用 Master Plan 边界的行政区敏感性测试。",
      highlights_zh: [
"比例偏低单元占比：76.3% → 55.9%",
 "重分类规划单元：165", 
"默认尺度会变成数据质量风险", 
"多尺度参数对比",
 "小贩中心 vs 连锁 POI 敏感度"
],
      proof_zh: [
        ["比例偏低单元占比", "76.3% → 55.9%"],
        ["重分类单元数", "165"],
        ["网格中位数对比", "1.000 vs 0.692"],
        ["对比网格尺度", "500 m / 1000 m / 2000 m"],
        ["行政区划影响", "规划区 vs 分区"]
      ],
      analyticsMeta_zh: [
        ["方法", "MAUP + UGCoP 参数扫描"],
        ["空间尺度", "500 m / 1000 m / 2000 m 网格 + 缓冲"],
        ["重分类单元", "165 个规划单元"],
        ["可复现性", "notebook 流水线，输出可复用"]
      ],
      analyticsTermConvention:
        'In this experiment, "poor" refers to a low hawker-to-chain ratio (i.e., S_u < 1), reflecting the spatial proportionality of two types of food outlets rather than absolute food deprivation or socioeconomic poverty.',
      analyticsTermConvention_zh:
        '本实验中"贫困"指小贩中心数量少于连锁餐饮数量（即 S_u < 1），反映的是两类餐饮设施的空间比例关系，并非绝对的食物匮乏或社会经济贫困。'
    },
    {
      id: "poi",
      category: "analytics",
      iconKey: "tag",
      title: "POI Semantic Audit",
      kicker: "discoverability",
      story: "When Amap calls a venue 'bar' and Xiaohongshu calls it 'livehouse', the same place becomes invisible to one search context and viral in another. I measured this gap across 20-30 Shanghai venues to quantify how platform classification choices affect discoverability.",
      evidence: "Thesis using hybrid entity resolution and BGE-M3 embedding-based semantic similarity measurement to compare music venue representations across Amap, ShowStart, and Xiaohongshu for 20-30 purposively sampled venues in Shanghai.",
      highlights: [
        "intra-platform comparison: Amap typecode vs. keytag",
        "inter-platform pairwise cosine similarity",
        "discoverability under three use contexts",
        "The same entity-resolution challenge applies wherever multi-source spatial data must merge into a single ground truth."
      ],
      proof: [
        ["matching method", "hybrid entity resolution"],
        ["embedding model", "BGE-M3"],
        ["sample size", "20-30 venues purposive"],
        ["platform sources", "Amap, ShowStart, Xiaohongshu"],
        ["pairwise comparisons", "intra-Amap + inter-platform"]
      ],
      analyticsMeta: [
        ["platform families", "mapping / ticketing / social-content"],
        ["method", "entity matching + BGE-M3 similarity"],
        ["sample frame", "20-30 Shanghai music venues"],
        ["risk surface", "venue discovery and ranking drift"]
      ],
      tags: ["#embedding", "#taxonomy", "#platform_governance", "#spatial_data"],
      demo: "poi",
      kicker_zh: "能不能被搜到",
      story_zh: "Amap 标成「酒吧」、Xiaohongshu 写成 livehouse，同一个地点在一种搜索里隐身，在另一种语境里爆红。我在上海通过目的性抽样选取了 20–30 个音乐场地，量化平台分类怎么改写「能不能被搜到」。",
      evidence_zh: "学位论文：混合实体解析 + BGE-M3 embedding 语义相似度，对照 Amap、ShowStart、Xiaohongshu 上 20–30 个上海音乐场地的表征。",
      highlights_zh: [
        "平台内对照：Amap typecode vs keytag",
        "平台间成对余弦相似度",
        "三种使用情境下的发现性",
        "多源空间数据要合成单一 ground truth 时，实体解析难题会原样迁移"
      ],
      proof_zh: [
        ["匹配方法", "混合实体解析"],
        ["嵌入模型", "BGE-M3"],
        ["样本量", "20–30 个场地（目的性抽样）"],
        ["平台来源", "Amap、ShowStart、小红书"],
        ["成对比较", "Amap 平台内 + 平台间"]
      ],
      analyticsMeta_zh: [
        ["平台类别", "地图 / 票务 / 社交内容"],
        ["方法", "实体匹配 + BGE-M3 相似度"],
        ["抽样范围", "20–30 个上海音乐场地"],
        ["风险面", "可发现性与排名漂移"]
      ]
    },
    {
      id: "geoai",
      category: "analytics",
      iconKey: "shield",
      title: "Responsible GeoAI",
      kicker: "governance gap",
      story: "A 2006-2026 GeoAI ethics synthesis turns the governance gap into four checks teams can verify before shipping place-based models. One control: flag training-region vs. deployment-region mismatch before shipping a place-based model, so the model does not assume Singapore's density applies to a rural deployment.",
      evidence: "Literature synthesis connecting critical GIS, VGI bias, spatial heterogeneity, and algorithmic accountability.",
      highlights: [
        "One control: flag training-region vs. deployment-region mismatch before shipping — prevents assuming Singapore density applies to rural deployment.",
        "frame: 2006-2026 review",
        "output: 4 operational controls",
        "governance tied to place-aware model behavior"
      ],
      proof: [
        ["literature window", "2006-2026"],
        ["operational controls", "4"],
        ["course context", "GeoAI ethics synthesis"]
      ],
      analyticsMeta: [
        ["literature window", "2006-2026 GeoAI ethics review"],
        ["output", "4 operational controls"],
        ["governance angle", "place-aware model accountability"],
        ["use case", "pre-shipping checklist for spatial AI systems"]
      ],
      tags: ["#geoai", "#ethics", "#platform_governance", "#spatial_data"],
      demo: "geoai",
      kicker_zh: "问责盲区",
      story_zh: "对2006-2026年 GeoAI 和相关领域关于伦理和问责的讨论进行文献综述，总结出四条相关的自查标准。比如：训练区域和部署区域不一致要先 flag，别让模型默认新加坡密度能套到乡村部署。跨学科阅读让我把 STS、批判性 GIS 等讨论收成上线前可勾选的几条清单，用可执行步骤约束带地点风险的模型，少做粗暴外推。",
      evidence_zh: "文献综述：critical GIS、VGI 偏差、空间异质性与算法问责串起来。",
      highlights_zh: [
        "控制项之一：上线前 flag 训练区 vs 部署区错配，而不是默认城市密度能外推到乡村。",
        "时间窗：2006–2026 综述",
        "产出：4 条可操作控制项",
        "治理绑在带地点风险的模型行为上"
      ],
      proof_zh: [
        ["文献时间窗", "2006–2026"],
        ["可操作控制项", "4"],
        ["课程背景", "GeoAI 伦理综述"]
      ],
      analyticsMeta_zh: [
        ["文献时间窗", "2006–2026 GeoAI 伦理综述"],
        ["产出", "4 条可操作控制项"],
        ["治理视角", "带地点风险的模型问责"],
        ["使用场景", "空间 AI 系统上线前清单"]
      ]
    },
    {
      id: "xiazhuang",
      category: "design",
      iconKey: "plan",
      title: "Xiazhuang Village Revitalization Plan",
      kicker: "lived-world planning / BIM + Twinmotion",
      story: "Field survey and GIS-informed layout for a Lishui village: three circulation routes were proposed; the GIS overlay revealed the second route crossed a flood-risk zone, eliminating it. The surviving desire line became the spine that organized all subsequent massing. Twinmotion makes it legible before anyone argues a clause.",
      evidence: "Personal statement project note for Xiazhuang (Yongyang, Lishui, Nanjing) plus benke image inventory; analysis axis is narrative-first because the six-image set has no separate analysis board.",
      highlights: ["survey + GIS refinement in ps.md", "outputs: modeling, posters, video", "Twinmotion pair: layout readability then atmosphere"],
      proof: [
        ["planning place", "Yongyang, Lishui, Nanjing"],
        ["process", "field survey + GIS refinement"],
        ["viz stack", "ArchiCAD + Twinmotion"],
        ["H5 demo", "layout + atmosphere stills"]
      ],
      designMeta: [
        ["site", "Yongyang, Lishui, Nanjing"],
        ["plan", "village revitalization layout"],
        ["visual output", "Twinmotion massing + atmosphere stills"]
      ],
      tags: ["#planning_design", "#visualization"],
      demo: "xiazhuang",
      kicker_zh: "实地规划 / BIM + Twinmotion",
      story_zh: "丽水某村的田野调查 + GIS 辅助布局：最初提出三条动线，GIS 叠加分析发现第二条穿过洪涝风险区，直接被否掉。留下的那条自发路径成了组织后续所有体量的主轴。Twinmotion 让这套逻辑在任何人争论条文之前就先看得懂。",
      evidence_zh: "个人陈述里的小庄（永阳、丽水、南京）项目笔记 + 本科图像清单；六张图没有单独分析板，所以叙事优先。",
      highlights_zh: ["田野 + GIS 细化写在 ps.md", "产出：建模、海报、视频", "Twinmotion 一对：先读布局，再读氛围"],
      proof_zh: [
        ["规划地点", "夏庄，永阳，南京"],
        ["流程", "田野 + GIS 细化"],
        ["可视化工具", "ArchiCAD + Twinmotion"],
        ["H5 演示", "布局图 + 氛围渲染"]
      ],
      designMeta_zh: [
        ["场地", "永阳，南京"],
        ["方案", "乡村规划"],
        ["视觉产出", "CAD+BIM+Twinmotion 规划范围建模+渲染"]
      ]
    },
    {
      id: "huijing",
      category: "design",
      iconKey: "render",
      title: "Huijing Huayuan Residential Landscape Plan",
      kicker: "lived-world housing / BIM + Twinmotion",
      story: "Steep topography forces lived-world planning: a 12m elevation change forced service circulation to split levels, avoiding a flat-grade landscape plan that would have buried the senior-care entrance at the bottom of the slope. Two poster boards carry analysis and design narrative, with Twinmotion stills for aerial, entrance mood, and riverfront views.",
      evidence: "Personal statement passage for Huijing Huayuan plus benke asset map; H5 demo uses xiaoqu_1 and xiaoqu_2 poster exports side by side, then three Twinmotion thumbnails.",
      highlights: ["posters: analysis + design boards (xiaoqu_2 / xiaoqu_1)", "GIS refinement of senior care, services, landscape", "Twinmotion thumbs: aerial, entrance rain, riverside"],
      proof: [
        ["site driver", "significant elevation change"],
        ["poster row", "huijing-poster-1 + huijing-poster-2"],
        ["thumb row", "aerial + entrance + riverside"],
        ["viz stack", "ArchiCAD + Twinmotion"]
      ],
      designMeta: [
        ["site", "residential landscape with steep topography"],
        ["plan", "services, senior care, and landscape refinement"],
        ["visual output", "poster boards + Twinmotion stills"]
      ],
      tags: ["#planning_design", "#visualization"],
      demo: "huijing",
      kicker_zh: "居住区规划 / BIM + Twinmotion",
      story_zh: "在有地势高差较大，超过6米的场地， 通过实地考察、GIS分析、CAD+BIM建模和立体规划，实现动线流畅、空间布局规范合理的规划设计，以及只管的视觉呈现。",
      evidence_zh: "个人陈述里的汇景华苑段落 + 本科资产地图；H5 并排 xiaoqu_1 / xiaoqu_2 海报导出，再加三张 Twinmotion 缩略图。",
      highlights_zh: ["海报：分析 + 设计（xiaoqu_2 / xiaoqu_1）", "住房、养老、服务、景观的 细化", "Twinmotion：鸟瞰、入口雨景、河岸"],
      proof_zh: [
        ["场地驱动因素", "显著高差"],
        ["海报组", "huijing-poster-1 + huijing-poster-2"],
        ["缩略图组", "鸟瞰 + 入口 + 河岸"],
        ["可视化工具", "ArchiCAD + Twinmotion"]
      ],
      designMeta_zh: [
        ["场地", "陡坡住区景观"],
        ["方案", "服务、养老与景观细化"],
        ["视觉产出", "海报板 + Twinmotion 静帧"]
      ]
    }
  ];


  var PROFILE = {
    roles: [
      { label: "GIS Researcher", icon: "MAP" },
      { label: "Urban Planner", icon: "PLAN" },
      { label: "Vibe Coder", icon: "CODE" }
    ],
    degree: "NUS Msc in Applied GIS",
    expected: "Sep 2026",
    tools: [
      ["Python", "GeoPandas", "NumPy", "GEE", "ArcGIS Pro", "QGIS", "SQL", "JavaScript" ],
      ["AutoCAD", "ArchiCAD(BIM)", "Twinmotion", "Figma", "SketchUp"," Photoshop"," Premiere Pro", "Tableau"  ]
    ],
    languages: [
      { lang: "EN", level: 0.92, note: "IELTS 8.0", note_zh: "学术（IELTS 8.0）" },
      { lang: "ZH", level: 1, note: "native", note_zh: "母语" },
      { lang: "FR", level: 0.28, note: "basic", note_zh: "基础" }
    ],
    profileIntro_en: "NUS MSc Applied GIS, Sep 2026. The design background taught me to read space qualitatively — desire lines, atmosphere, what a place means. The GIS research taught me to verify whether that reading holds at scale. Each one made the other more honest. That's the gap I work in, and this portfolio is a prototype of what happens when you take it seriously.",
    profileIntro_zh: "新加坡国立大学应用地理信息系统硕士（NUS MSc Applied GIS），预计 2026 年 9 月毕业。设计背景让我从质性角度读空间——动线、氛围、地方意味着什么；GIS 训练让我检验这些读法在更大尺度上是否站得住脚。两者互相校准。这就是我在意的工作缝隙，本作品集则是认真对待它时能做成的雏形。",
    contact: {
      email: "jellycwq@foxmail.com",
      linkedin: "linkedin.com/in/wanqing-cui",
      github: "github.com/BUBBLE-WELL"
    }
  };

  var TAGS = ["All", "#spatial_data", "#embedding", "#data_quality", "#platform_governance", "#geoai", "#ethics", "#taxonomy", "#planning_design", "#visualization"];
  var PROJECT_COUNT = CASES.length;
  var STARTERS = [
    { label: "overview", label_zh: "概览", hint: "Structure summary first; no deep reading.", hint_zh: "先看结构，不用深读。", type: "STARTER_PICKED", value: "overview", variant: "primary" },
    { label: "browse by tag", label_zh: "按标签看", hint: "Filter by a hiring angle or story lens.", hint_zh: "按招聘角度或故事镜头筛。", type: "STARTER_PICKED", value: "tag", variant: "primary" },
    { label: "open project grid", label_zh: "打开项目网格", hint: "Scan the project library like a database.", hint_zh: "像翻数据库一样扫项目库。", type: "STARTER_PICKED", value: "grid", variant: "primary" }
  ];
  var ABOUT_CHIPS = [
    { label: "tell me some things about you", label_zh: "介绍一下你自己！", hint: "Show a compact profile snapshot before the projects.", hint_zh: "先看一小段简介，再上项目。", type: "ABOUT_PICKED", value: "profile", variant: "primary" }
  ];
  var FOLLOWUPS = [
    { label: "show all projects", label_zh: "全部项目", hint: "Open the full card library.", hint_zh: "打开整张卡片库。", type: "VIEW_CHANGED", value: "grid", variant: "secondary" },
    { label: "explain taxonomy", label_zh: "标签说明", hint: "Explain what the hashtags mean.", hint_zh: "这些话题标签各自管什么。", type: "VIEW_CHANGED", value: "taxonomy", variant: "secondary" },
    { label: "back to overview", label_zh: "返回概览", hint: "Return to the compact structure summary.", hint_zh: "回到结构总览，卡片先收起。", type: "VIEW_CHANGED", value: "overview", variant: "secondary" }
  ];
  var ROLE_PROFILES = [
    {
      speaker_id: "qa_lead",
      display_name_en: "QA Lead",
      display_name_zh: "质检员",
      model: "GPT-5.5-medium",
      real_world_role_zh: "数据质量 / POI 数据产品",
      what_i_do_en: ["Set entity-resolution thresholds", "Keep confirmed POI layer clean", "Route disputed samples to annex"],
      what_i_do_zh: ["设定实体解析阈值", "守住 confirmed POI 主层干净", "有争议的样本分流到附录"],
      style_note: "short engineering decision language",
      style_note_zh: "短句工程决策口吻",
      avatar_path: "pics/zhijian_QA%20Lead.svg",
      initials: "QA"
    },
    {
      speaker_id: "ethics_compliance",
      display_name_en: "Ethical",
      display_name_zh: "规矩姐",
      model: "Kimi-K2.5",
      real_world_role_zh: "算法合规 / AI 治理",
      what_i_do_en: ["Check what the pipeline excludes", "Catch performative compliance", "Require caveat and audit trail"],
      what_i_do_zh: ["顺着流水线看它排除了啥", "揪表演式合规", "要可见 caveat 和审计痕迹"],
      style_note: "policy brief risk diagnosis",
      style_note_zh: "政策简报式风险诊断",
      avatar_path: "pics/guijujie_Ethics%20Compliance.svg",
      initials: "EC"
    },
    {
      speaker_id: "field_ops",
      display_name_en: "Field Ops",
      display_name_zh: "古法策划",
      model: "DeepSeek-Reasoner",
      real_world_role_zh: "用户研究 / 非标商户运营",
      what_i_do_en: ["Visit venues with no POI", "Report what the map omits", "Push back when legibility equals erasure"],
      what_i_do_zh: ["去没有 POI 的场地见人", "写地图没记下来的事", "可读性等于抹除时顶回去"],
      style_note: "field notes with concrete scenes",
      style_note_zh: "带具体场景的现场笔记",
      avatar_path: "pics/shouyin_Field%20Ops.svg",
      initials: "FO"
    }
  ];
  var ROLE_PROFILE_BY_ID = ROLE_PROFILES.reduce(function (index, profile) {
    index[profile.speaker_id] = profile;
    return index;
  }, {});
  /** Observer panel copy — single source; language via workshopLanguage (see workshopPanelText). */
  var WORKSHOP_PANEL = {
    kicker_en: "observer mode",
    kicker_zh: "旁听对话",
    title_en: "The Missing DIY Venue",
    title_zh: "消失的地下音乐场地",
    intro_en: "Three agents (GPT-5.5, Kimi-K2.5, DeepSeek-Reasoner) review the same portfolio evidence from semantic, ethical, and field-operation angles. This is a curated debate: you are watching the method conflict in observer mode, not chatting with a live system.",
    intro_zh: "三个 agent（GPT-5.5、Kimi-K2.5、DeepSeek-Reasoner）从语义、伦理和现场运营角度复查同一组数据。这是一场精选整理过的辩论：你处于旁听模式，观察方法冲突，而不是与实时系统对话。"
  };
  var WORKSHOP_CARDS = [
    {
        "turn_id": "T01",
        "speaker_id": "ethics_compliance",
        "trace": {
            "model": "Kimi-K2.5"
        },
        "title_en": "Valid Procedure, Normative Cost",
        "title_zh": "程序有效，但有规范代价",
        "highlight_en": "Procedural exclusion can compress intentional non-legibility into statistical absence.",
        "highlight_zh": "程序性排除可能把有意不可见压缩成统计上的不存在。",
        "tension_en": "Spatial justice is displaced when the system rewards legibility only.",
        "tension_zh": "当系统只奖励可读性，空间正义会被流程整洁性覆盖。",
        "summary_en": "This risks turning intentional non-legibility into non-existence; I require parallel reporting and a qualitative annex.",
        "summary_zh": "我判断这会把有意不可见误写成不存在；我要求并行报告，并保留质性附录。",
        "original_en": "The tension lies between **legibility and justice**: a method that rewards platforms' commercial visibility criteria will systematically purge venues that survive precisely by evading those same platforms' surveillance infrastructure.\n\n**Procedural validity:** the multi-source rule is internally consistent. Requiring Amap, ShowStart, and Xiaohongshu confirmation is defensible for cross-validation. The venue failed on two of three signals; exclusion is arithmetically correct.\n\n**Normative consequences:** the project also says this venue intentionally avoids listing. By design, it will never pass a platform-first gate. Excluding it does not reduce error; it reclassifies intentional non-legibility as non-existence.\n\nIf the final report claims that the sample represents Shanghai DIY music spaces, the frame has silently narrowed to spaces legible to platform surveillance. That is a different population.\n\nMitigation requires parallel reporting, a qualitative annex for intentionally non-listed venues, and reflexive documentation that names the discoverability boundary.",
        "translated_zh": "这里的张力在于**可读性与正义**：如果方法奖励平台商业可见性，它会系统性清除那些正是依靠规避平台监控而存续的场地。\n\n**程序有效性：**多源规则内部一致。要求 Amap、ShowStart 和小红书共同确认，作为交叉验证是可以辩护的。这个场地在三个信号中失败了两个，因此从计算流程看，排除成立。\n\n**规范后果：**项目材料同时说明，这个场地有意避免被平台列出。它本来就不会通过平台优先的门槛。排除它并没有减少误差，而是把有意不可见重新分类为不存在。\n\n如果最终报告声称样本代表上海 DIY 音乐空间，实际框架已经缩窄为平台监控可读的空间。这是另一个总体。\n\n最低缓解方案包括并行报告、为有意不列名场地保留质性附录，以及在方法部分明确写出可发现性边界。",
        "actions": [
            {
                "kind": "jump_case",
                "target": "poi",
                "label": "jump to POI audit"
            },
            {
                "kind": "jump_tag",
                "target": "#ethics",
                "label": "filter #ethics"
            }
        ]
    },
    {
        "turn_id": "T02",
        "speaker_id": "field_ops",
        "trace": {
            "model": "DeepSeek-Reasoner"
        },
        "title_en": "Invisibility Can Be Survival",
        "title_zh": "不可见有时是生存策略",
        "highlight_en": "Some venues are not missing data; they avoid platform legibility to stay alive.",
        "highlight_zh": "有些场地不是缺失数据，而是主动规避平台可读性以维持生存。",
        "tension_en": "Legibility-only criteria can erase real places from the map.",
        "tension_zh": "只承认可读性的标准，会把真实地点从地图里制度性抹除。",
        "summary_en": "I see shuttered signs, side doors, and no map pin; this is not an error, this is survival.",
        "summary_zh": "我看到卷帘门、侧门和没有定位的入口；这不是错误，这是生存。",
        "original_en": "Hotpot alley steam curls around a rusted fire escape. Behind a grease drum, there is a door with no handle and a muffled bass line through the concrete floor. No POI, no geotag, one 2024 ghost listing.\n\nDatabases miss the owner's nod to a regular, the cash-only notebook kept off-platform, and set lists whispered through a WeChat group of 47. The refusal is not oversight; it is architecture.\n\nDoes a venue become erased when compliance insists legibility is its only valid form of existence?",
        "translated_zh": "火锅店后巷的蒸汽绕着生锈的消防梯升起。油桶后面有一扇没有把手的门，混凝土地面下传来低频。没有 POI，没有地理标签，只有一个 2024 年的幽灵列表。\n\n数据库看不见老板对熟客的点头，看不见抽屉里的现金账本，也看不见 47 人微信群里口头传递的演出安排。拒绝被列出不是疏漏，而是一种空间结构。\n\n当合规流程坚持可读性是唯一有效的存在形式时，一个场地是否就这样被抹除了？",
        "actions": [
            {
                "kind": "jump_tag",
                "target": "#spatial_data",
                "label": "filter #spatial_data"
            },
            {
                "kind": "jump_case",
                "target": "poi",
                "label": "jump to semantic evidence"
            }
        ]
    },
    {
        "turn_id": "T03",
        "speaker_id": "qa_lead",
        "trace": {
            "model": "GPT-5.5-medium"
        },
        "title_en": "Strict Core, Annex Escape Valve",
        "title_zh": "主层严格，附录分流",
        "highlight_en": "QA keeps thresholds strict while routing disputed samples to annex/manual review.",
        "highlight_zh": "QA 保持实体解析阈值严格，同时把争议样本分流到附录或人工复核。",
        "tension_en": "The confirmed layer must stay auditable while edge cases get a governed path.",
        "tension_zh": "确认层需要可审计，边缘案例也需要制度化入口。",
        "summary_en": "I keep entity-resolution threshold strict. I route disputed items to annex/manual review. Output: excluded from confirmed POI layer.",
        "summary_zh": "我保持实体解析阈值严格；我将争议样本分流到附录或人工复核；输出是不进入 confirmed POI 主层。",
        "original_en": "- Rule enforced: entity inclusion requires multi-source confirmation, buffer checks, and platform evidence. Do not promote a single-platform trace to geocoded POI.\n- Evidence found: ShowStart has one listing plus event signal. That is activity evidence, not location-confirmed POI evidence.\n- Evidence not found: Amap returns no matching POI within 50 m, 100 m, or 200 m. Xiaohongshu has no clear geotagged corroboration.\n- Methodology boundary: Ethics and Field Ops are right that hidden venues can be erased by legibility requirements. But that is a reporting limitation, not a basis to override entity-resolution thresholds.\n- Acceptable compromise: keep exclusion from the confirmed POI layer, add a qualitative annex flag: single-platform, intentionally low-legibility venue; manual follow-up recommended.\n\nDecision implication: exclude from confirmed POI layer; include only as manual-review annex.",
        "translated_zh": "- 执行规则：实体纳入需要多源确认、缓冲区检查与平台证据。不能把单平台痕迹提升为地理编码 POI。\n- 已有证据：ShowStart 有一次列表和活动信号。这是活动证据，不是位置确认的 POI 证据。\n- 缺失证据：Amap 在 50 m、100 m、200 m 内没有匹配 POI。小红书没有清晰的地理标签佐证。\n- 方法边界：Ethics 与 Field Ops 对可读性规则会抹除隐藏场地的判断是对的。但这是报告限制，不是覆盖实体解析阈值的理由。\n- 可接受折中：保持其排除在 confirmed POI 主层之外，增加质性附录标记：单平台、低可读性、建议人工跟进。\n\n决策含义：排除在 confirmed POI 主层之外，仅作为人工复核附录保留。",
        "actions": [
            {
                "kind": "jump_case",
                "target": "poi",
                "label": "jump to POI method"
            },
            {
                "kind": "jump_tag",
                "target": "#taxonomy",
                "label": "filter #taxonomy"
            }
        ]
    },
    {
        "turn_id": "T04",
        "speaker_id": "ethics_compliance",
        "trace": {
            "model": "Kimi-K2.5"
        },
        "title_en": "Guardrails Must Be Operational",
        "title_zh": "问责护栏必须可执行",
        "highlight_en": "Accountability moves from principle to operations through flags, disclosure, and a shadow table.",
        "highlight_zh": "问责需要从原则推进到操作层：标记、披露和影子表。",
        "tension_en": "If controls are optional, compliance becomes narrative performance.",
        "tension_zh": "如果控制项只是可选项，合规就会退化成叙事姿态。",
        "summary_en": "This risks accountability drift after deployment; I require sensitivity flags, downstream disclosure, and a shadow table.",
        "summary_zh": "我判断上线后存在问责漂移风险；我要求敏感性标记、下游披露与影子表并行落地。",
        "original_en": "QA reframes the issue as a low-legibility venue, but the deeper problem is a pipeline assumption: the system treats platform confirmation as the only valid route to existence.\n\nI require three operational guardrails:\n\n1. **Sensitivity layer flag** in the matched dataset for disputed venues.\n2. **Mandatory downstream disclosure** built into the visualization layer.\n3. **Parallel shadow table** preserving the epistemic boundary between measurable venues and known-to-exist venues.\n\nWithout these controls, the annex becomes a soft apology rather than an accountability mechanism.",
        "translated_zh": "QA 把问题重述为低可读性场地，但更深的问题是流水线假设：系统把平台确认当作存在的唯一有效路径。\n\n我要求三个可执行护栏：\n\n1. 在匹配数据集中为争议场地设置**敏感性层标记**。\n2. 将**强制下游披露**嵌入可视化层。\n3. 保留**并行影子表**，维持可测量场地与已知存在场地之间的认识边界。\n\n如果没有这些控制项，附录只是柔性道歉，而不是问责机制。",
        "actions": [
            {
                "kind": "jump_case",
                "target": "geoai",
                "label": "jump to GeoAI controls"
            },
            {
                "kind": "jump_tag",
                "target": "#platform_governance",
                "label": "filter #platform_governance"
            }
        ]
    },
    {
        "turn_id": "T05",
        "speaker_id": "field_ops",
        "trace": {
            "model": "DeepSeek-Reasoner"
        },
        "title_en": "Safety Comes Before Neatness",
        "title_zh": "现场安全优先于系统整洁",
        "highlight_en": "Hardened-layer exclusion may be acceptable, but disclosure can expose people and places.",
        "highlight_zh": "严格控制层里的排除可以接受，但披露本身可能暴露人和地点。",
        "tension_en": "A tidy system can still produce unsafe field consequences.",
        "tension_zh": "系统再整洁，也可能在现场制造风险后果。",
        "summary_en": "I accept exclusion in the hardened layer. I do not accept disclosure that raises exposure risk.",
        "summary_zh": "我接受严格控制层里的排除；我不接受会抬高暴露风险的披露。",
        "original_en": "Damp floorboards. Burned coffee in the back. Sticky stage tape underfoot: the map's blind spot. Databases do not smell the sweat or hear the whispered door codes.\n\nQA: Correct. This annex stays off the hardened layer. Manual review only, because the venue shifts names every two weeks and the owner's face changes with each landlord call.\n\nEthics: Flag it, yes. But disclosure hits a wall. How do you tell a patron that this spot moves when rent goes up without making the address a liability? Shadow table is fine; it lives in the dark where algorithms cannot index.\n\nReframing: Whose safety are we building: the system's tidy liability, or the scene's right to exist unindexed?",
        "translated_zh": "潮湿的地板，后屋烧焦的咖啡味，脚下黏住的舞台胶带：这是地图的盲点。数据库闻不到汗味，也听不见被低声传递的门口暗号。\n\nQA：对。这个附录不能进入严格控制层。只能人工复核，因为场地每两周换一次名字，房东每次来查时，老板的身份也会跟着变化。\n\nEthics：标记可以。但披露会撞墙。你怎样告诉一个观众这个地方会随着租金上涨而移动，同时又不让地址本身变成风险？影子表可以存在，但它应该待在算法不能索引的暗处。\n\n重新提问：我们到底在保护谁的安全？是系统整洁的责任边界，还是现场不被索引也能存在的权利？",
        "actions": [
            {
                "kind": "jump_case",
                "target": "xiazhuang",
                "label": "jump to lived-world design"
            },
            {
                "kind": "jump_tag",
                "target": "#visualization",
                "label": "filter #visualization"
            }
        ]
    },
    {
        "turn_id": "T06",
        "speaker_id": "qa_lead",
        "trace": {
            "model": "GPT-5.5-medium"
        },
        "title_en": "Controls Defined, Path Split",
        "title_zh": "控制项已定义，路径已分流",
        "highlight_en": "Define sensitivity_flag, visibility_tier, and review_required; isolate sensitive rows in a controlled shadow table.",
        "highlight_zh": "定义 sensitivity_flag、visibility_tier、review_required，并将敏感记录隔离到受控影子表。",
        "tension_en": "Precision requires strict controls, even when throughput slows.",
        "tension_zh": "即便吞吐下降，精度仍要求严格控制。",
        "summary_en": "I set controls: sensitivity_flag, visibility_tier, review_required. Output: auditable split workflow.",
        "summary_zh": "我设定控制项：sensitivity_flag、visibility_tier、review_required；输出是可审计的分流流程。",
        "original_en": "- Rules enforced: inclusion requires multi-source confirmation: ShowStart/name evidence, georeferenced POI or coordinate confidence, platform corroboration, and buffer checks against nearby candidates.\n- Evidence state: ShowStart-only trace exists; Amap georeferenced POI is zero; Xiaohongshu clear posts are zero; no stable coordinate anchor. Under entity resolution, that is insufficient for conflation.\n- Ethics proposal accepted with limits: add sensitivity_flag, evidence_gap_reason, visibility_tier, and review_required fields. Keep a shadow table for non-public audit records.\n- Field Ops concern accepted: mandatory disclosure should not mean public disclosure. Report aggregated counts and methodological limitations publicly; keep venue-level shadow entries access-controlled.\n- Implementation-safe compromise: main dataset excludes the venue; annex records it as unconfirmed_sensitive_candidate; public report says one ShowStart-only DIY/noise venue was withheld from the mapped POI layer due to insufficient corroboration and exposure risk.\n\nDecision implication: exclude from confirmed POI layer; include only in protected shadow table / annex as needs manual review.",
        "translated_zh": "- 执行规则：纳入需要多源确认，包括 ShowStart / 名称证据、地理编码 POI 或坐标置信、平台佐证，以及与附近候选点的缓冲区检查。\n- 证据状态：只有 ShowStart 痕迹；Amap 地理编码 POI 为零；小红书清晰帖子为零；没有稳定坐标锚点。按实体解析标准，这不足以进行合并。\n- 有限制接受 Ethics 方案：增加 sensitivity_flag、evidence_gap_reason、visibility_tier 与 review_required 字段。为非公开审计记录保留影子表。\n- 接受 Field Ops 的风险提醒：强制披露不应等于公开披露。公开报告只给聚合计数与方法限制，场地级影子条目保持访问控制。\n- 实现安全折中：主数据集排除该场地；附录将其记录为 unconfirmed_sensitive_candidate；公开报告说明有一个 ShowStart-only 的 DIY/noise 场地因佐证不足与暴露风险未进入地图 POI 层。\n\n决策含义：排除在 confirmed POI 主层之外，仅作为需要人工复核的受保护影子表 / 附录记录。",
        "actions": [
            {
                "kind": "jump_case",
                "target": "geoai",
                "label": "jump to governance gap"
            },
            {
                "kind": "back_to_debate",
                "target": "T03",
                "label": "back to QA stance"
            }
        ]
    },
    {
        "turn_id": "T07",
        "speaker_id": "ethics_compliance",
        "trace": {
            "model": "Kimi-K2.5"
        },
        "title_en": "Prevent Performative Compliance",
        "title_zh": "防止表演性合规",
        "highlight_en": "Exclusion logic must be discoverable, logged by tier, appealable through future review, and visibly caveated.",
        "highlight_zh": "排除逻辑必须可发现、分级留痕、可持续申诉，并带可见 caveat。",
        "tension_en": "Without verifiability and appeals, ethics language masks governance power.",
        "tension_zh": "没有可验证与可申诉，伦理话语会遮蔽治理权力。",
        "summary_en": "This risks becoming performative ethics; I require discoverable exclusion logic, tiered logs, living appeals, and a visible caveat.",
        "summary_zh": "我判断这有变成表演性伦理的风险；我要求可发现的排除逻辑、分级日志、持续申诉和可见 caveat。",
        "original_en": "The proposal achieves **procedural protection** because data is retained, but it risks **performative ethics** if the shadow table's existence substitutes for actionable accountability.\n\n**Procedurally valid:** shadow tables preserve data integrity without contaminating confirmed POI; sensitivity fields allow differentiated access controls; aggregate disclosure avoids individual venue exposure.\n\n**Normatively concerning:** if the shadow table is invisible to downstream analysts, the exclusion operates identically to deletion, just with better audit trails for the system. Aggregate disclosure can become an alibi when it reports excluded counts without letting anyone understand why the exclusion happened.\n\nMinimum accountability conditions:\n\n1. **Reflexive transparency:** the shadow table's existence must be discoverable without privileged access.\n2. **Tiered access with burden of justification:** sensitivity fields must trigger graded release protocols, not binary hide/show.\n3. **Living exclusion log with appeal path:** a venue excluded in one cycle must be able to become confirmed later without rebuilding the entire dataset.\n4. **Methodological acknowledgment in output:** any POI product using this pipeline must surface a caveat that DIY and informal venues may be underrepresented.\n\nFinal question: does the shadow table serve epistemic humility, or institutional protection? If the latter dominates, the proposal is performative.",
        "translated_zh": "这个方案实现了**程序性保护**，因为数据被保留了；但如果影子表的存在替代了可执行问责，它就会变成**表演性伦理**。\n\n**程序上有效：**影子表保护数据完整性，同时不污染 confirmed POI；敏感性字段允许差异化访问控制；聚合披露避免暴露单个场地。\n\n**规范上仍有问题：**如果影子表对下游分析者不可见，那么排除的效果与删除相同，只是系统拥有了更好的审计轨迹。聚合披露如果只报告排除数量，却不让人理解为什么排除，就会变成借口。\n\n最低问责条件：\n\n1. **反身透明：**影子表的存在本身必须在无特权访问下可被发现。\n2. **带有理由负担的分级访问：**敏感字段应触发分级释放协议，而不是二元隐藏 / 显示。\n3. **带申诉路径的动态排除日志：**某个周期被排除的场地，之后应能变成确认记录，而不需要重建整个数据集。\n4. **输出中的方法承认：**任何使用该 POI 流水线的产品，都必须可见地提示 DIY 与非正式场地可能被低估。\n\n最后的问题是：影子表服务的是认识上的谦逊，还是机构自保？如果后者占主导，这就是表演性合规。",
        "actions": [
            {
                "kind": "jump_tag",
                "target": "#ethics",
                "label": "filter #ethics"
            },
            {
                "kind": "jump_case",
                "target": "geoai",
                "label": "jump to controls"
            }
        ]
    },
    {
        "turn_id": "T08",
        "speaker_id": "field_ops",
        "trace": {
            "model": "DeepSeek-Reasoner"
        },
        "title_en": "Governance Can Become Another Gate",
        "title_zh": "治理也可能变成另一道门槛",
        "highlight_en": "Governance can harden into a new gate while hidden-space logic is flattened into platform legibility.",
        "highlight_zh": "治理可能硬化成新的门槛，而隐蔽空间逻辑被压平成平台可读性。",
        "tension_en": "Administrative legibility can overwrite ground-level survival behavior.",
        "tension_zh": "行政可读性可能覆盖现场的生存行为。",
        "summary_en": "I see another gate forming at the governance layer. Hidden spaces do not become imaginary because platforms cannot read them.",
        "summary_zh": "我看到治理层正在形成另一道门；平台读不出来，不代表那些隐蔽空间是虚构的。",
        "original_en": "The floorboards groan under boots: sweat, beer, and mildew cling. A blown fuse blacks out the back room; someone's phone flashlight traces the bass amp.\n\nDatabases do not see the nod that lets the broke kid in, the whispered clean up before 4 that keeps police away, or the silence that falls when a known undercover walks past.\n\nYour ethical appeal boards and tiered watch lists? That is a new door policy. But who polices the police? Who sees the strung-out artist you would exclude, and how is their moral weight discounted?\n\nReframing: when your visible caveat becomes a velvet rope for trust debts, does institutional protection become just another lock on the basement door?",
        "translated_zh": "靴子踩过地板，木板发出响声；汗味、啤酒味和霉味黏在一起。保险丝烧断，后屋一片黑，有人用手机手电照着贝斯音箱。\n\n数据库看不见那个让没钱孩子进门的点头，看不见为了避开警察而低声传递的“4 点前收拾完”，也看不见熟悉的便衣路过时全场突然安静。\n\n你们的伦理申诉委员会和分级观察名单？那也是一种新的门禁制度。但谁来监督监督者？谁看见那个你们会排除的疲惫艺术家？他们的道德重量又如何被折算？\n\n重新提问：当可见 caveat 变成信任债务的绒绳门槛，机构保护是否只是地下室门上的另一把锁？",
        "actions": [
            {
                "kind": "jump_case",
                "target": "huijing",
                "label": "jump to site evidence"
            },
            {
                "kind": "jump_tag",
                "target": "#planning_design",
                "label": "filter #planning_design"
            }
        ]
    },
    {
        "turn_id": "T09",
        "speaker_id": "qa_lead",
        "trace": {
            "model": "GPT-5.5-medium"
        },
        "title_en": "Threshold Fixed, Audit Path Hardened",
        "title_zh": "阈值不降，审计路径加固",
        "highlight_en": "Close with auditability, SLA, and immutable history while keeping inclusion threshold unchanged.",
        "highlight_zh": "以可审计性、SLA 和不可变历史收束，同时保持纳入阈值不变。",
        "tension_en": "Governance speed is bounded by traceability requirements.",
        "tension_zh": "治理速度必须受可追溯性要求约束。",
        "summary_en": "I do not lower inclusion threshold. I enforce auditability, SLA, and immutable history.",
        "summary_zh": "我不下调纳入阈值；我执行可审计性、SLA 与不可变历史。",
        "original_en": "- Rule enforced: inclusion still requires multi-source confirmation: spatial buffer match, platform evidence, and corroborating venue identity. A shadow table is metadata, not a POI record.\n- Evidence state: ShowStart-only trace is insufficient. Amap has no georeferenced POI. Xiaohongshu has no clear independent posts. No stable coordinates, address, operator identity, or cross-platform alias chain.\n- Governance control: every exclusion row must store reason code, source dates, query terms, buffer radius, embedding score range, reviewer ID, and reproducibility notes.\n- Appeal control: new evidence triggers manual review within a fixed SLA, for example 5 working days. Accepted evidence types include coordinates, event flyers with address, screenshots with dates, organizer links, or repeat platform traces.\n- Access control: shadow table writes require logged reviewer access, immutable append-only history, and monthly audit sampling. No silent deletion, no private blacklist, no institutional veto field.\n\nDecision implication: exclude from confirmed POI layer; retain in auditable shadow table; needs manual review if new evidence arrives.",
        "translated_zh": "- 执行规则：纳入仍然需要多源确认，包括空间缓冲匹配、平台证据与场地身份佐证。影子表是元数据，不是 POI 记录。\n- 证据状态：ShowStart-only 痕迹不足。Amap 没有地理编码 POI。小红书没有清晰独立帖子。没有稳定坐标、地址、运营者身份或跨平台别名链。\n- 治理控制：每一条排除记录必须存储原因代码、来源日期、查询词、缓冲半径、embedding 分数范围、审核者 ID 与可复现说明。\n- 申诉控制：新证据触发固定 SLA 内的人工复核，例如 5 个工作日。可接受证据包括坐标、带地址活动海报、带日期截图、组织者链接或重复平台痕迹。\n- 访问控制：影子表写入需要记录审核者访问、不可变追加历史和月度抽样审计。没有静默删除，没有私有黑名单，没有机构否决字段。\n\n决策含义：排除在 confirmed POI 主层之外；保留在可审计影子表中；新证据出现时进入人工复核。",
        "actions": [
            {
                "kind": "jump_case",
                "target": "poi",
                "label": "jump to confirmed layer"
            },
            {
                "kind": "back_to_debate",
                "target": "T06",
                "label": "back to controls"
            }
        ]
    },
    {
        "turn_id": "T10",
        "speaker_id": "ethics_compliance",
        "trace": {
            "model": "Kimi-K2.5"
        },
        "title_en": "Procedural Gain, Normative Dispute Remains",
        "title_zh": "程序有进展，规范分歧仍在",
        "highlight_en": "Procedural improvements are real, but the normative disagreement remains open.",
        "highlight_zh": "程序改进是真实的，但规范性分歧仍然开放。",
        "tension_en": "Process closure cannot substitute for cross-role normative review.",
        "tension_zh": "流程收口不能替代跨角色规范审查。",
        "summary_en": "The question is not whether procedures improved; the question is whether the normative dispute is still live.",
        "summary_zh": "问题不只是流程是否改进，而是规范性分歧是否仍然存在。",
        "original_en": "QA's commitments address procedural integrity: thresholds, audit trails, and SLAs. This is valid and necessary. However, the normative issue persists. A system that is fair by procedure can still produce distributive harm when the underlying entity model assumes legibility and treats DIY venues as noise to be resolved away.\n\nThe shadow table preserves audit, but not necessarily presence. If excluded venues remain absent from downstream consumption, recommendation engines, or policy dashboards, spatial injustice is reproduced downstream with better documentation.\n\nStakeholders still face residual risks:\n\n- Venue operators lack standing to know they were resolved out or to contest the ontology itself.\n- Users continue to encounter a POI layer that silently under-represents alternative and subcultural spaces.\n- Analysts carry the interpretive burden of knowing exclusion happened without having a parallel would-be map.\n\nConcrete next actions:\n\n1. **Sensitivity reporting:** every POI export should include a shadow count metric by neighborhood.\n2. **Qualitative annex:** the thesis workflow should maintain a parallel unresolved venue note populated by Field Ops.\n3. **Exclusion review:** before thesis finalization, QA Lead, Field Ops, and Ethics Compliance should manually sample 10 shadow-table entries and ask whose absence shaped the result.\n\nWhat is accepted: the audit infrastructure is operationally sound and reduces silent deletion risks.\n\nWhat remains unresolved: whether verifiable cross-platform presence is itself a threshold that privileges capitalized, platform-integrated venues over DIY ones.",
        "translated_zh": "QA 的承诺解决了程序完整性：阈值、审计轨迹与 SLA。这是有效且必要的。但规范问题仍然存在。一个在程序上公平的系统，如果其底层实体模型假设可读性，并把 DIY 场地当成需要消解的噪声，仍然会制造分配性伤害。\n\n影子表保留了审计，但不一定保留了存在。如果被排除的场地仍然缺席于下游消费、推荐系统或政策仪表盘，那么空间不公只是带着更好的文档在下游重演。\n\n相关方仍有剩余风险：\n\n- 场地运营者没有资格知道自己被 resolved out，也难以争辩本体设定本身。\n- 用户继续看到一个静默低估另类与亚文化空间的 POI 层。\n- 分析者承担解释负担：知道发生了排除，却没有一张并行的“本可存在”地图。\n\n具体下一步：\n\n1. **敏感性报告：**每次 POI 导出都应按街区包含 shadow count 指标。\n2. **质性附录：**thesis 工作流应维护一份由 Field Ops 填写的 unresolved venue note。\n3. **排除复核：**在 thesis 定稿前，QA Lead、Field Ops 与 Ethics Compliance 应手动抽样 10 条影子表记录，追问是谁的缺席塑造了结果。\n\n已接受：审计基础设施在操作上成立，并降低了静默删除风险。\n\n仍未解决：跨平台可验证存在是否本身就是一个偏向资本化、平台整合场地的阈值。",
        "actions": [
            {
                "kind": "jump_tag",
                "target": "#taxonomy",
                "label": "filter #taxonomy"
            },
            {
                "kind": "jump_case",
                "target": "geoai",
                "label": "jump to governance controls"
            }
        ]
    }
];
  var WORKSHOP_ACTION_LABEL_ZH = {
    "jump to POI audit": "跳转到 POI 审计",
    "filter #ethics": "筛选 #ethics",
    "filter #spatial_data": "筛选 #spatial_data",
    "jump to semantic evidence": "跳转到语义证据",
    "jump to POI method": "跳转到 POI 方法",
    "filter #taxonomy": "筛选 #taxonomy",
    "jump to GeoAI controls": "跳转到 GeoAI 控制项",
    "filter #platform_governance": "筛选 #platform_governance",
    "jump to lived-world design": "跳转到实地设计证据",
    "filter #visualization": "筛选 #visualization",
    "jump to governance gap": "跳转到治理缝隙",
    "back to QA stance": "回到 QA 立场",
    "jump to controls": "跳转到控制项",
    "jump to site evidence": "跳转到场地证据",
    "filter #planning_design": "筛选 #planning_design",
    "jump to confirmed layer": "跳转到确认层",
    "back to controls": "回到控制项",
    "jump to governance controls": "跳转到治理控制项"
  };
  var messages = [];
  var activeTag = "All";
  var currentView = "chat";
  var expandedCaseIds = new Set();
  var messageId = 0;
  var typingLine = 0;
  var conversationState = "landing";
  var workshopPreviewShown = false;
  var workshopAlertSeen = false;
  var workshopReplayAvailable = false;
  var workshopActive = false;
  var workshopAlertOpen = false;
  var workshopAlertAutoDismissTimer = null;
  var workshopAlertHovering = false;
  var roleProfileOpen = false;
  var roleProfileReturnFocus = null;
  var workshopLanguage = "en";
  var portfolioLanguage = "en";
  var workshopVisibleCards = 0;
  var workshopOpenCards = new Set();
  var workshopAutoPlay = true;
  var workshopAutoPlayTimer = null;
  var typingTimer = null;
  var dotsTimer = null;
  var currentSpiderRight = null;
  var cachedFollowUpChips = [];

  function qs(id) {
    return document.getElementById(id);
  }

  function initPortfolioLanguageFromDom() {
    var lang = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    portfolioLanguage = lang.indexOf("zh") === 0 ? "zh" : "en";
    workshopLanguage = portfolioLanguage;
  }

  function syncLangToggleButton() {
    var langBtn = qs("lang-toggle");
    if (!langBtn) return;
    langBtn.textContent = portfolioLanguage === "zh" ? "EN" : "中文";
  }

  function syncLandingText() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (key && LANDING_TEXTS[key]) {
        el.textContent = LANDING_TEXTS[key][portfolioLanguage];
      }
    });
    var landingBtn = qs("lang-toggle-landing");
    if (landingBtn) {
      landingBtn.textContent = portfolioLanguage === "zh" ? "EN" : "中文";
    }
  }

  function messageBubbleDisplayContent(message) {
    if (!message || !message.staticKey || !STATIC_MESSAGES[message.staticKey]) {
      return message && message.content != null ? message.content : "";
    }
    if (message.role === "assistant" && message.kind === "text" && message._staticTyping === true) {
      return message.content;
    }
    return STATIC_MESSAGES[message.staticKey][portfolioLanguage];
  }

  function togglePortfolioLanguage() {
    portfolioLanguage = portfolioLanguage === "zh" ? "en" : "zh";
    workshopLanguage = portfolioLanguage;
    document.body.dataset.lang = portfolioLanguage;
    document.documentElement.setAttribute("lang", portfolioLanguage === "zh" ? "zh-CN" : "en");
    window.clearTimeout(typingTimer);
    window.clearTimeout(dotsTimer);
    typingTimer = null;
    dotsTimer = null;
    messages = messages.filter(function (m) {
      return m.kind !== "dots";
    });
    messages.forEach(function (m) {
      if (m.staticKey && STATIC_MESSAGES[m.staticKey]) {
        m._staticTyping = false;
        m.content = STATIC_MESSAGES[m.staticKey][portfolioLanguage];
      }
    });
    var mainArea = document.querySelector(".main-area");
    var scrollTop = mainArea ? mainArea.scrollTop : 0;
    syncLandingText();
    syncStoryChrome();
    syncTopbarLabel();
    renderTags();
    renderCards();
    if (mainArea) mainArea.scrollTop = scrollTop;
    renderMessages();
    renderConversationIndex();
    if (cachedFollowUpChips.length) {
      syncFollowUps(cachedFollowUpChips);
    }
    if (workshopActive) {
      renderWorkshopParticipants();
      renderWorkshopPanel({ preserveScroll: true });
    }
  }

  function t(en, zh) {
    return portfolioLanguage === "zh" ? zh : en;
  }

  function tw(en, zh) {
    return workshopLanguage === "zh" ? zh : en;
  }

  function tagHint(key) {
    return t(TAG_HINTS_EN[key], TAG_HINTS_ZH[key] || TAG_HINTS_EN[key]);
  }

  function chipDisplayLabel(chip) {
    return t(chip.label, chip.label_zh || chip.label);
  }

  function chipDisplayHint(chip) {
    return t(chip.hint, chip.hint_zh || chip.hint);
  }

  function syncTopbarLabel() {
    var btn = qs("back-landing");
    if (!btn) return;
    btn.textContent = workshopActive ? t("exit", "退出") : t("back", "返回");
  }

  function syncStoryChrome() {
    var exitRail = qs("workshop-exit-rail");
    if (exitRail) {
      var sp = exitRail.querySelector("span");
      if (sp) sp.textContent = t("back to portfolio", "返回作品页");
      exitRail.setAttribute("aria-label", t("Exit workshop back to portfolio", "退出工作坊，返回作品页"));
    }
    var replay = qs("workshop-replay");
    if (replay) {
      replay.textContent = t("⚠ Workshop Conflict", "⚠ 工作坊冲突");
      replay.setAttribute("aria-label", t("Open workshop conflict preview", "打开工作坊冲突预览"));
    }
    var storyStrong = document.querySelector(".story-topbar strong");
    if (storyStrong) {
      storyStrong.textContent = t("spatial data · governance · the gaps between", "空间数据 · 治理 · 错位之间");
    }
    var tagKicker = document.querySelector(".tag-head .app-kicker");
    if (tagKicker) tagKicker.textContent = t("search by hashtag", "按话题标签筛选");
    var storyMain = qs("story-view");
    if (storyMain) {
      storyMain.setAttribute("aria-label", t("Tagged portfolio story", "带标签的作品集故事"));
    }
    var leftRail = document.querySelector(".left-rail");
    if (leftRail) {
      leftRail.setAttribute("aria-label", t("Conversation index, workshop entry, contact", "对话索引、工作坊入口、联系"));
    }
    var convIdx = qs("conversation-index");
    if (convIdx) convIdx.setAttribute("aria-label", t("Conversation index", "对话索引"));
    var wPart = qs("workshop-participants");
    if (wPart) wPart.setAttribute("aria-label", t("Workshop participants", "工作坊参与者"));
    var tagPanel = document.querySelector(".tag-panel");
    if (tagPanel) tagPanel.setAttribute("aria-label", t("Hashtag search", "话题标签筛选"));
    var caseRes = qs("case-results");
    if (caseRes) caseRes.setAttribute("aria-label", t("Project results", "项目结果"));
    var wPanel = qs("workshop-panel");
    if (wPanel) wPanel.setAttribute("aria-label", t("Workshop conflict preview", "工作坊冲突预览"));
    syncLangToggleButton();
  }

  function unicodeChars(text) {
    return Array.from(String(text));
  }

  function startTyping() {
    var lines = ["Hi, I'm CUI WANQING \u{1F47E}", "你好, 我叫崔莞青", "I'm always looking for what's missing in the map."];
    var heroEl = qs("hero-text");
    if (!heroEl) return;

    function type(text, done) {
      var chars = unicodeChars(text);
      var i = 0;
      heroEl.innerHTML = '<span class="caret"></span>';
      (function step() {
        heroEl.innerHTML = escapeHtml(chars.slice(0, i).join("")) + '<span class="caret"></span>';
        if (i < chars.length) {
          i += 1;
          window.setTimeout(step, 44 + Math.random() * 22);
        } else {
          window.setTimeout(done, 1500);
        }
      }());
    }

    function erase(done) {
      var chars = unicodeChars(heroEl.textContent.trim());
      (function step() {
        chars.pop();
        heroEl.innerHTML = escapeHtml(chars.join("")) + '<span class="caret"></span>';
        if (chars.length) window.setTimeout(step, 22);
        else done();
      }());
    }

    function cycle() {
      type(lines[typingLine], function () {
        typingLine = (typingLine + 1) % lines.length;
        erase(cycle);
      });
    }

    cycle();
  }

  function spiderRightOffset() {
    return window.innerWidth < 760 ? 44 : 76;
  }

  /** Tunable elastic drop: thread overshoots then settles (manual tweak). */
  var SPIDER_SPRING = {
    targetVh: 0.55,
    delayBeforeDropMs: 180,
    riseMs: 720,
    overshoot: 0.038,
    settleMs: 380
  };

  var spiderLandingRaf = null;

  function cancelSpiderLanding() {
    if (spiderLandingRaf != null) {
      cancelAnimationFrame(spiderLandingRaf);
      spiderLandingRaf = null;
    }
    var wrap = qs("spider-wrap");
    var thread = qs("thread");
    if (wrap) wrap.classList.remove("spider-springing");
    if (thread) thread.classList.remove("spider-springing");
  }

  function setSpiderVisible(visible) {
    var wrap = qs("spider-wrap");
    var thread = qs("thread");
    if (!wrap || !thread) return;
    wrap.style.opacity = visible ? "1" : "0";
    wrap.style.visibility = visible ? "visible" : "hidden";
    thread.style.opacity = visible ? "1" : "0";
  }

  function setSpiderLength(length) {
    var wrap = qs("spider-wrap");
    var thread = qs("thread");
    if (!wrap || !thread) return;
    var right = spiderRightOffset();
    var px = Math.max(0, Math.round(length));
    if (right !== currentSpiderRight) {
      currentSpiderRight = right;
      document.documentElement.style.setProperty("--spider-right", right + "px");
      document.documentElement.style.setProperty("--spider-center-right", right + 29 + "px");
      wrap.style.right = right + "px";
    }
    wrap.style.top = px + "px";
    thread.style.height = px + "px";
  }

  function runSpiderLandingSpring() {
    var wrap = qs("spider-wrap");
    var thread = qs("thread");
    if (!wrap || !thread) return;
    if (document.body.dataset.state !== "landing") return;
    cancelSpiderLanding();
    wrap.classList.add("spider-springing");
    thread.classList.add("spider-springing");
    var target = window.innerHeight * SPIDER_SPRING.targetVh;
    var peak = target * (1 + SPIDER_SPRING.overshoot);
    var t0 = performance.now();
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function smoothstep(t) {
      return t * t * (3 - 2 * t);
    }
    function phase1(now) {
      var u = Math.min(1, (now - t0) / SPIDER_SPRING.riseMs);
      setSpiderLength(peak * easeOutCubic(u));
      if (u < 1) {
        spiderLandingRaf = requestAnimationFrame(phase1);
      } else {
        t0 = now;
        spiderLandingRaf = requestAnimationFrame(phase2);
      }
    }
    function phase2(now) {
      var u = Math.min(1, (now - t0) / SPIDER_SPRING.settleMs);
      setSpiderLength(peak + (target - peak) * smoothstep(u));
      if (u < 1) {
        spiderLandingRaf = requestAnimationFrame(phase2);
      } else {
        spiderLandingRaf = null;
        wrap.classList.remove("spider-springing");
        thread.classList.remove("spider-springing");
      }
    }
    spiderLandingRaf = requestAnimationFrame(phase1);
  }

  function resetLandingSpider() {
    cancelSpiderLanding();
    setSpiderVisible(true);
    setSpiderLength(0);
    window.setTimeout(function () {
      if (document.body.dataset.state === "landing") {
        runSpiderLandingSpring();
      }
    }, SPIDER_SPRING.delayBeforeDropMs);
  }

  function retractSpider() {
    cancelSpiderLanding();
    setSpiderVisible(true);
    setSpiderLength(0);
    window.setTimeout(function () {
      if (document.body.dataset.state === "story") setSpiderVisible(false);
    }, 980);
  }

  function dispatchConversation(event) {
    if (!event || !event.type) return;

    if (event.type === "USER_HI") {
      if (conversationState !== "landing") return;
      cancelSpiderLanding();
      conversationState = "after_hi";
      messages = [];
      activeTag = "All";
      expandedCaseIds = new Set();
      setView("chat");
      syncFollowUps([]);
      renderTags();
      renderCards();
      retractSpider();
      appendMessage({ role: "user", kind: "text", staticKey: "user_hi", content: STATIC_MESSAGES.user_hi[portfolioLanguage] });
      window.setTimeout(function () {
        document.body.dataset.state = "story";
        syncTopbarLabel();
        syncStoryChrome();
        typeAssistant({ staticKey: "assistant_intro" }, function () {
          showAboutChoice();
        });
      }, 520);
      return;
    }

    if (event.type === "ABOUT_PICKED") {
      clearChoiceMessages();
      appendMessage({ role: "user", kind: "text", content: event.label });
      conversationState = "profile";
      typeAssistant(profileCopy(), function () {
        appendMessage({ role: "assistant", kind: "profile" });
        showStarterChoices();
        maybeShowWorkshopAlert();
      });
      return;
    }

    if (event.type === "STARTER_PICKED") {
      clearChoiceMessages();
      appendMessage({ role: "user", kind: "text", content: event.label });
      if (event.value === "overview") {
        conversationState = "overview";
        setView("chat");
        typeAssistant(t(
          "Five projects, one question: when does simplifying a place change who can find it, fund it, or govern it? Start here for the structure, then go deeper by tag or card.",
          "五个项目，一个问题：地点一旦被简化，谁能找到它、谁能给它争取资源、谁有权管它？"
        ), function () {
          loadResultsShell("overview", "All", []);
        });
      } else if (event.value === "tag") {
        conversationState = "tag";
        typeAssistant(t(
          "Pick a hashtag first. I will return only the cases that support that hiring or story angle.",
          "先选标签。我只返回跟招聘或故事角度相关的案例。"
        ), function () {
          loadResultsShell("tag", "", []);
        });
      } else if (event.value === "grid") {
        conversationState = "grid";
        typeAssistant(t(
          "Opening the project grid. This is the database-feeling view: all cards, expandable evidence, and reusable tags.",
          "打开项目网格。这里是数据库视图：所有卡片可展开，证据和标签都能复用。"
        ), function () {
          loadResultsShell("grid", "All", []);
        });
      }
      return;
    }

    if (event.type === "TAG_SELECTED") {
      clearChoiceMessages();
      activeTag = event.value;
      appendMessage({ role: "user", kind: "text", content: event.value === "All" ? t("Show all projects.", "全部项目") : event.value });
      var results = filteredCases();
      expandedCaseIds = new Set(results.length && event.value !== "All" ? [results[0].id] : []);
      setView(event.value === "All" ? "grid" : "tag");
      renderTags();
      renderCards();
      typeAssistant(resultCopy(event.value), function () {
        syncFollowUps(FOLLOWUPS);
        scrollToResults();
      });
      return;
    }

    if (event.type === "VIEW_CHANGED") {
      clearChoiceMessages();
      if (event.value === "overview") {
        appendMessage({ role: "user", kind: "text", content: t("Back to overview.", "返回概览。") });
        loadResultsShell("overview", "All", []);
        typeAssistant(t(
          "Back to the compact overview. The cards stay collapsed so the structure is easier to scan.",
          "回到概览，卡片收起，方便快速浏览。"
        ), function () {
          syncFollowUps(FOLLOWUPS);
        });
      } else if (event.value === "grid") {
        appendMessage({ role: "user", kind: "text", content: t("Show all projects.", "全部项目") });
        loadResultsShell("grid", "All", []);
        typeAssistant(t("Showing all projects in grid mode.", "网格模式，全部项目。"), function () {
          syncFollowUps(FOLLOWUPS);
        });
      } else if (event.value === "taxonomy") {
        appendMessage({ role: "user", kind: "text", content: t("Explain the taxonomy.", "讲讲标签体系。") });
        loadResultsShell("split", "All", []);
        typeAssistant(t(
          "The tags are not categories in separate boxes. They are lenses: one project can support several hiring stories.",
          "标签不是分类框，是视角。同一个项目可以支撑好几个招聘故事。"
        ), function () {
          syncFollowUps(FOLLOWUPS);
        });
      }
      return;
    }

    if (event.type === "CASE_TOGGLED") {
      if (event.open) expandedCaseIds.add(event.value);
      else expandedCaseIds.delete(event.value);
    }
  }

  function setView(view) {
    currentView = view;
    document.body.dataset.view = view;
    document.body.dataset.tagSelected = activeTag ? "true" : "false";
    syncTopbarLabel();
  }

  function loadResultsShell(view, tag, expandedIds, followUps) {
    activeTag = tag;
    expandedCaseIds = new Set(expandedIds || []);
    setView(view);
    renderTags();
    renderCards();
    syncFollowUps(followUps === undefined ? FOLLOWUPS : followUps);
  }

  function createMessage(message) {
    var next = Object.assign({ id: "m" + messageId }, message);
    messageId += 1;
    return next;
  }

  function appendMessage(message) {
    messages.push(createMessage(message));
    trimMessages();
    renderMessages();
  }

  function trimMessages() {
    messages = messages.filter(function (message) {
      return message.kind !== "dots";
    });
  }

  function typeAssistant(source, done) {
    var staticKey = null;
    var fullText;
    if (source && typeof source === "object" && source.staticKey) {
      staticKey = source.staticKey;
      fullText = STATIC_MESSAGES[staticKey] ? STATIC_MESSAGES[staticKey][portfolioLanguage] : "";
    } else {
      fullText = String(source || "");
    }
    window.clearTimeout(typingTimer);
    window.clearTimeout(dotsTimer);
    messages = messages.filter(function (message) {
      return message.kind !== "dots";
    });
    var dotMessage = createMessage({ role: "assistant", kind: "dots" });
    var dotId = dotMessage.id;
    messages.push(dotMessage);
    trimMessages();
    renderMessages();

    dotsTimer = window.setTimeout(function () {
      messages = messages.filter(function (message) {
        return message.id !== dotId;
      });
      var message = createMessage({
        role: "assistant",
        kind: "text",
        content: "",
        staticKey: staticKey,
        _staticTyping: staticKey ? true : false
      });
      messages.push(message);
      trimMessages();
      renderMessages();

      var chars = unicodeChars(fullText);
      var i = 0;
      (function step() {
        message.content = chars.slice(0, i).join("");
        renderMessages();
        if (i < chars.length) {
          i += 2;
          typingTimer = window.setTimeout(step, 8 + Math.random() * 10);
        } else {
          message.content = fullText;
          message._staticTyping = false;
          trimMessages();
          renderMessages();
          if (typeof done === "function") {
            window.setTimeout(done, 120);
          }
        }
      }());
    }, 460);
  }

  function showStarterChoices() {
    conversationState = "showing_starters";
    appendMessage({
      role: "user",
      kind: "chips",
      chips: STARTERS
    });
  }

  function showAboutChoice() {
    conversationState = "intro_choice";
    appendMessage({
      role: "user",
      kind: "chips",
      chips: ABOUT_CHIPS
    });
  }

  function profileCopy() {
    var text = PROFILE["profileIntro_" + portfolioLanguage];
    return text || PROFILE.profileIntro_en || "";
  }

  function syncFollowUps(chips) {
    var nextChips = chips || [];
    cachedFollowUpChips = nextChips.length ? nextChips.slice() : [];
    renderInlineFollowUps(nextChips);
  }

  function clearChoiceMessages(options) {
    messages = messages.filter(function (message) {
      return message.kind !== "chips";
    });
    renderMessages();
    if (!options || !options.preserveFollowUps) {
      syncFollowUps([]);
    }
  }

  function maybeShowWorkshopAlert() {
    if (workshopPreviewShown) return;
    window.setTimeout(function () {
      if (workshopPreviewShown) return;
      openWorkshopAlert();
    }, 1000);
  }

  function openWorkshopAlert(options) {
    var forced = options && options.force;
    if (!forced && !canAutoOpenWorkshopAlert()) return;
    var modal = qs("workshop-alert");
    if (!modal) return;
    workshopPreviewShown = true;
    workshopAlertOpen = true;
    workshopAlertHovering = false;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("show");
    if (workshopAlertAutoDismissTimer) {
      window.clearTimeout(workshopAlertAutoDismissTimer);
      workshopAlertAutoDismissTimer = null;
    }
    workshopAlertAutoDismissTimer = window.setTimeout(function () {
      workshopAlertAutoDismissTimer = null;
      if (!workshopAlertOpen || workshopAlertHovering) return;
      closeWorkshopAlert();
    }, 8000);
  }

  function canAutoOpenWorkshopAlert() {
    return ["showing_starters", "overview", "tag", "grid", "taxonomy"].indexOf(conversationState) >= 0 && !workshopActive;
  }

  function closeWorkshopAlert() {
    var modal = qs("workshop-alert");
    if (!modal || !workshopAlertOpen) return;
    workshopAlertOpen = false;
    workshopAlertHovering = false;
    workshopAlertSeen = true;
    workshopReplayAvailable = true;
    renderWorkshopReplay();
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    if (workshopAlertAutoDismissTimer) {
      window.clearTimeout(workshopAlertAutoDismissTimer);
      workshopAlertAutoDismissTimer = null;
    }
  }

  function bindWorkshopAlert() {
    var modal = qs("workshop-alert");
    if (!modal) return;
    var notifyClose = modal.querySelector(".workshop-titlebar .workshop-x[data-workshop-close]");
    if (notifyClose) notifyClose.classList.add("workshop-notification-close");
    modal.addEventListener("mouseenter", function () {
      if (!modal.classList.contains("show")) return;
      workshopAlertHovering = true;
      if (workshopAlertAutoDismissTimer) {
        window.clearTimeout(workshopAlertAutoDismissTimer);
        workshopAlertAutoDismissTimer = null;
      }
    });
    modal.addEventListener("mouseleave", function () {
      workshopAlertHovering = false;
      if (!workshopAlertOpen || !modal.classList.contains("show")) return;
      if (workshopAlertAutoDismissTimer) {
        window.clearTimeout(workshopAlertAutoDismissTimer);
        workshopAlertAutoDismissTimer = null;
      }
      workshopAlertAutoDismissTimer = window.setTimeout(function () {
        workshopAlertAutoDismissTimer = null;
        if (!workshopAlertOpen || workshopAlertHovering) return;
        closeWorkshopAlert();
      }, 8000);
    });
    modal.querySelectorAll("[data-workshop-close]").forEach(function (button) {
      if (button.classList && button.classList.contains("workshop-alert-backdrop")) return;
      button.addEventListener("click", function () {
        closeWorkshopAlert();
      });
    });
    var listen = modal.querySelector("[data-workshop-listen]");
    if (listen) {
      listen.addEventListener("click", function () {
        closeWorkshopAlert();
        enterWorkshop();
      });
    }
    var replay = qs("workshop-replay");
    if (replay) {
      replay.addEventListener("click", function () {
        openWorkshopAlert({ force: true });
      });
    }
    var railExit = qs("workshop-exit-rail");
    if (railExit) {
      railExit.addEventListener("click", exitWorkshop);
    }
    document.addEventListener("keydown", function (event) {
      if (roleProfileOpen) {
        if (event.key === "Escape") closeRoleProfile();
        return;
      }
      if (!workshopAlertOpen) return;
      if (event.key === "Escape") {
        closeWorkshopAlert();
      }
    });
    bindRoleProfilePopup();
  }

  function bindRoleProfilePopup() {
    var modal = qs("role-profile-popup");
    if (!modal) return;
    modal.querySelectorAll("[data-role-profile-close]").forEach(function (button) {
      button.addEventListener("click", function () {
        closeRoleProfile();
      });
    });
  }
  function renderWorkshopReplay() {
    document.body.dataset.workshopReplay = workshopReplayAvailable ? "true" : "false";
  }

  function renderWorkshopParticipants() {
    var root = qs("workshop-participants");
    if (!root) return;
    root.innerHTML = '<div class="workshop-rail-label">' + escapeHtml(tw("participants", "参与者")) + '</div>' + ROLE_PROFILES.map(function (profile) {
      var aria = workshopLanguage === "zh"
        ? "打开 " + profile.display_name_en + " 的角色档案"
        : "Open profile for " + profile.display_name_en;
      return '<article class="workshop-participant" data-role-profile="' + escapeHtml(profile.speaker_id) + '" tabindex="0" role="button" aria-label="' + escapeHtml(aria) + '">' +
        workshopAvatar(profile, "workshop-participant-avatar") +
        '<div><strong>' + escapeHtml(profile.display_name_en) + '</strong><span>' + escapeHtml(profile.display_name_zh + ' / ' + profile.real_world_role_zh) + '</span></div>' +
        '</article>';
    }).join("") + '<div class="workshop-rail-label">' + escapeHtml(tw("turns", "回合")) + '</div><div class="workshop-turn-index">' + WORKSHOP_CARDS.map(function (card) {
      return '<button type="button" data-workshop-turn="' + escapeHtml(card.turn_id) + '"><span>' + escapeHtml(card.turn_id) + '</span><strong>' + escapeHtml(workshopText(card, "title")) + '</strong></button>';
    }).join("") + '</div>';
    root.querySelectorAll("[data-workshop-turn]").forEach(function (button) {
      button.addEventListener("click", function () {
        scrollWorkshopToTurn(button.getAttribute("data-workshop-turn"));
      });
    });
    bindRoleProfileTriggers(root);
  }
  function renderWorkshopPanel(options) {
    var root = qs("workshop-panel");
    if (!root) return;
    var mainArea = document.querySelector(".main-area");
    var previousScrollTop = options && options.preserveScroll && mainArea ? mainArea.scrollTop : null;
    var cards = WORKSHOP_CARDS.slice(0, Math.max(0, workshopVisibleCards));
    root.innerHTML = '<section class="workshop-panel-head">' +
      '<div><span class="app-kicker">' + escapeHtml(workshopPanelText("kicker")) + '</span><h2>' + escapeHtml(workshopPanelText("title")) + '</h2><p>' + escapeHtml(workshopPanelText("intro")) + '</p></div>' +
      '<div class="workshop-panel-controls"><div class="workshop-language-toggle" aria-label="' + escapeHtml(tw("Workshop language", "工作坊语言")) + '"><button type="button" data-workshop-lang="en" class="' + (workshopLanguage === "en" ? "active" : "") + '">EN</button><button type="button" data-workshop-lang="zh" class="' + (workshopLanguage === "zh" ? "active" : "") + '">中文</button></div>' +
      '<button class="workshop-autoplay-btn" type="button" data-workshop-autoplay>' + (workshopAutoPlay ? "\u23f8 " + tw("pause", "\u6682\u505c") : "\u25b6 " + tw("play", "\u64ad\u653e")) + "</button></div>" +
      '</section>' +
      '<div class="workshop-dialogue" aria-live="polite">' + cards.map(workshopCard).join("") + '</div>';
    bindWorkshopPanel(root);
    var msgs = root.querySelectorAll(".workshop-dialogue .workshop-message");
    var staggerPartial = options && options.staggerEntrancePartial;
    msgs.forEach(function (el, i) {
      if (staggerPartial) {
        if (i < workshopVisibleCards - 1) el.classList.add("visible");
      } else if (i < workshopVisibleCards) {
        el.classList.add("visible");
      }
    });
    if (previousScrollTop !== null && mainArea) {
      window.requestAnimationFrame(function () {
        mainArea.scrollTop = previousScrollTop;
      });
    }
  }

  function bindWorkshopPanel(root) {
    root.querySelectorAll("[data-workshop-lang]").forEach(function (button) {
      button.addEventListener("click", function () {
        workshopLanguage = button.getAttribute("data-workshop-lang") === "zh" ? "zh" : "en";
        portfolioLanguage = workshopLanguage;
        renderWorkshopParticipants();
        renderWorkshopPanel({ preserveScroll: true });
        syncStoryChrome();
      });
    });
    root.querySelectorAll(".workshop-details[data-turn-id]").forEach(function (details) {
      details.addEventListener("toggle", function () {
        var turnId = details.getAttribute("data-turn-id");
        if (!turnId) return;
        if (details.open) {
          workshopOpenCards.add(turnId);
          stopWorkshopAutoPlayStream();
        } else {
          workshopOpenCards.delete(turnId);
        }
      });
    });
    root.querySelectorAll("[data-workshop-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        stopWorkshopAutoPlayStream();
        handleWorkshopAction(button.getAttribute("data-workshop-action"), button.getAttribute("data-workshop-target"));
      });
    });
    root.querySelectorAll("[data-workshop-autoplay]").forEach(function (button) {
      button.addEventListener("click", function () {
        toggleWorkshopAutoPlay();
      });
    });
    bindRoleProfileTriggers(root);
  }

  function stopWorkshopAutoPlayStream() {
    workshopAutoPlay = false;
    window.clearTimeout(workshopAutoPlayTimer);
    workshopAutoPlayTimer = null;
    renderWorkshopControls();
  }

  function toggleWorkshopAutoPlay() {
    workshopAutoPlay = !workshopAutoPlay;
    if (workshopAutoPlay) {
      revealWorkshopCards();
    } else {
      window.clearTimeout(workshopAutoPlayTimer);
      workshopAutoPlayTimer = null;
    }
    renderWorkshopControls();
  }

  function renderWorkshopControls() {
    var btn = document.querySelector("#workshop-panel [data-workshop-autoplay]");
    if (!btn) return;
    btn.textContent = workshopAutoPlay ? "\u23f8 " + tw("pause", "暂停") : "\u25b6 " + tw("play", "播放");
  }

  function bindRoleProfileTriggers(root) {
    root.querySelectorAll("[data-role-profile]").forEach(function (trigger) {
      if (trigger.dataset.roleBound === "true") return;
      trigger.dataset.roleBound = "true";
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        openRoleProfile(trigger.getAttribute("data-role-profile"), trigger);
      });
      trigger.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openRoleProfile(trigger.getAttribute("data-role-profile"), trigger);
      });
    });
  }

  function openRoleProfile(speakerId, source) {
    var profile = ROLE_PROFILE_BY_ID[speakerId];
    var modal = qs("role-profile-popup");
    var content = qs("role-profile-content");
    if (!profile || !modal || !content) return;
    roleProfileReturnFocus = source || document.activeElement;
    roleProfileOpen = true;
    content.innerHTML = roleProfileContent(profile);
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("show");
    var card = modal.querySelector(".role-profile-card");
    if (card) card.focus();
  }

  function closeRoleProfile(options) {
    var modal = qs("role-profile-popup");
    if (!modal || !roleProfileOpen) return;
    roleProfileOpen = false;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    if (!options || options.returnFocus !== false) {
      var target = roleProfileReturnFocus && document.contains(roleProfileReturnFocus) ? roleProfileReturnFocus : null;
      if (target && typeof target.focus === "function") target.focus();
    }
  }

  function roleProfileContent(profile) {
    var field = "what_i_do_" + workshopLanguage;
    var lines = profile[field] || profile.what_i_do_en || [];
    var labWhat = workshopLanguage === "zh" ? "职责" : "what I do";
    var labStyle = workshopLanguage === "zh" ? "风格说明" : "style note";
    var styleBody = workshopLanguage === "zh" && profile.style_note_zh ? profile.style_note_zh : profile.style_note;
    return '<div class="role-profile-hero" data-role-profile-card="' + escapeHtml(profile.speaker_id) + '">' +
      workshopAvatar(profile, "role-profile-avatar") +
      '<div><span id="role-profile-title" class="role-profile-kicker">' + escapeHtml(profile.initials || profile.speaker_id) + '</span>' +
      '<strong>' + escapeHtml(profile.display_name_en) + ' / ' + escapeHtml(profile.display_name_zh) + '</strong>' +
      '<p>' + escapeHtml(profile.real_world_role_zh) + '</p></div>' +
      '</div>' +
      '<div class="role-profile-section"><span>' + escapeHtml(labWhat) + '</span><ul>' + lines.map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      }).join("") + '</ul></div>' +
      '<div class="role-profile-section"><span>' + escapeHtml(labStyle) + '</span><p>' + escapeHtml(styleBody) + '</p></div>';
  }

  function workshopText(card, field) {
    return card[field + "_" + workshopLanguage] || card[field + "_en"] || "";
  }

  function workshopPanelText(field) {
    return WORKSHOP_PANEL[field + "_" + workshopLanguage] || WORKSHOP_PANEL[field + "_en"] || "";
  }

  function workshopOriginalText(card) {
    return workshopLanguage === "zh" ? card.translated_zh : card.original_en;
  }

  function workshopHasDenseOriginal(card) {
    var original = wordCount(workshopOriginalText(card));
    var summary = wordCount(workshopText(card, "summary"));
    return original >= summary;
  }

  function wordCount(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function inlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function markdownToHtml(text) {
    return String(text || "")
      .trim()
      .split(/\n{2,}/)
      .filter(Boolean)
      .map(function (block) {
        var lines = block.split(/\n/);
        if (lines.every(function (line) { return /^-\s+/.test(line); })) {
          return "<ul>" + lines.map(function (line) {
            return "<li>" + inlineMarkdown(line.replace(/^-\s+/, "")) + "</li>";
          }).join("") + "</ul>";
        }
        if (lines.every(function (line) { return /^\d+\.\s+/.test(line); })) {
          return "<ol>" + lines.map(function (line) {
            return "<li>" + inlineMarkdown(line.replace(/^\d+\.\s+/, "")) + "</li>";
          }).join("") + "</ol>";
        }
        return "<p>" + lines.map(inlineMarkdown).join("<br>") + "</p>";
      })
      .join("");
  }

  function workshopCard(card) {
    var profile = ROLE_PROFILE_BY_ID[card.speaker_id] || fallbackProfile(card.speaker_id);
    var name = workshopLanguage === "zh" ? profile.display_name_zh + ' / ' + profile.display_name_en : profile.display_name_en + ' / ' + profile.display_name_zh;
    var originalLabel = workshopLanguage === "zh" ? "中文译文" : "Original (EN)";
    var summaryLang = workshopLanguage === "zh" ? ' lang="zh-CN"' : "";
    var tensionLang = workshopLanguage === "zh" ? ' lang="zh-CN"' : "";
    var profileAria = workshopLanguage === "zh"
      ? "打开 " + profile.display_name_en + " 的角色档案"
      : "Open profile for " + profile.display_name_en;
    var details = workshopHasDenseOriginal(card)
      ? '<details class="workshop-details" data-turn-id="' + escapeHtml(card.turn_id) + '"' + (workshopOpenCards.has(card.turn_id) ? " open" : "") + '><summary>' + escapeHtml(workshopLanguage === "zh" ? "展开原文" : "expand original") + '</summary>' +
        '<div class="workshop-original single"><section' + (workshopLanguage === "zh" ? ' lang="zh-CN"' : "") + '><h4>' + escapeHtml(originalLabel) + '</h4>' + markdownToHtml(workshopOriginalText(card)) + '</section></div>' +
        '<div class="workshop-actions">' + card.actions.map(workshopActionButton).join("") + '</div>' +
        '</details>'
      : '<div class="workshop-actions workshop-actions-compact">' + card.actions.map(workshopActionButton).join("") + '</div>';
    return '<div class="message workshop-message" data-workshop-card="' + escapeHtml(card.turn_id) + '" data-speaker="' + escapeHtml(card.speaker_id) + '">' +
      '<button class="workshop-avatar-button" type="button" data-role-profile="' + escapeHtml(profile.speaker_id) + '" aria-label="' + escapeHtml(profileAria) + '">' + workshopAvatar(profile, "workshop-agent-avatar") + '</button>' +
      '<div class="bubble workshop-bubble">' +
      '<div class="workshop-bubble-header">' +
      '<button type="button" class="workshop-speaker" data-role-profile="' + escapeHtml(profile.speaker_id) + '">' + escapeHtml(name) + '</button>' +
      '<span class="workshop-turn-id">' + escapeHtml(card.turn_id) + '</span>' +
      '</div>' +
      '<div class="workshop-bubble-body">' +
      '<h3>' + escapeHtml(workshopText(card, "title")) + '</h3>' +
      '<p class="workshop-highlight">' + escapeHtml(workshopText(card, "highlight")) + '</p>' +
      '<p class="workshop-summary"' + summaryLang + '>' + escapeHtml(workshopText(card, "summary")) + '</p>' +
      '<div class="workshop-tension"><strong>' + escapeHtml(workshopLanguage === "zh" ? "张力" : "tension") + '</strong><span' + tensionLang + '>' + escapeHtml(workshopText(card, "tension")) + '</span></div>' +
      details +
      "</div></div></div>";
  }

  function workshopActionLabel(action) {
    var lab = action.label || "";
    if (workshopLanguage === "zh" && WORKSHOP_ACTION_LABEL_ZH[lab]) return WORKSHOP_ACTION_LABEL_ZH[lab];
    return lab || action.target || "";
  }

  function workshopActionButton(action) {
    return '<button class="choice-chip secondary" type="button" data-workshop-action="' + escapeHtml(action.kind) + '" data-workshop-target="' + escapeHtml(action.target) + '"><span>' + escapeHtml(workshopActionLabel(action)) + '</span></button>';
  }

  function workshopAvatar(profile, className) {
    if (profile.avatar_path) {
      return '<span class="' + escapeHtml(className) + '" aria-hidden="true"><img src="' + escapeHtml(profile.avatar_path) + '" alt="" loading="lazy" decoding="async" /></span>';
    }
    return '<span class="' + escapeHtml(className) + '" aria-hidden="true">' + escapeHtml(profile.initials || "AG") + '</span>';
  }

  function fallbackProfile(id) {
    return { speaker_id: id || "unknown", display_name_en: "Agent", display_name_zh: "Agent", model: "unknown", real_world_role_zh: "review", what_i_do_en: [], what_i_do_zh: [], style_note: "", style_note_zh: "", avatar_path: "", initials: "AG" };
  }

  function revealWorkshopCards() {
    window.clearTimeout(workshopAutoPlayTimer);
    workshopAutoPlayTimer = null;
    if (!workshopActive) return;
    if (!workshopAutoPlay) return;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      workshopVisibleCards = WORKSHOP_CARDS.length;
      renderWorkshopPanel();
      var panelRm = qs("workshop-panel");
      if (panelRm) {
        panelRm.querySelectorAll(".workshop-message").forEach(function (el) {
          el.classList.add("visible");
        });
      }
      return;
    }
    if (workshopVisibleCards < WORKSHOP_CARDS.length) {
      workshopVisibleCards += 1;
      renderWorkshopPanel({ staggerEntrancePartial: true });
      var lastCard = WORKSHOP_CARDS[workshopVisibleCards - 1];
      var newCard = lastCard ? document.querySelector('[data-workshop-card="' + cssEscape(lastCard.turn_id) + '"]') : null;
      if (newCard) {
        void newCard.offsetWidth;
        newCard.classList.add("visible");
      }
      if (workshopAutoPlay && workshopVisibleCards < WORKSHOP_CARDS.length) {
        workshopAutoPlayTimer = window.setTimeout(revealWorkshopCards, 800);
      }
    }
  }

  function scrollWorkshopToTurn(turnId) {
    var root = mainScrollRoot();
    if (!root || !turnId) return;
    var target = document.querySelector('[data-workshop-card="' + cssEscape(turnId) + '"]');
    if (!target) {
      var index = WORKSHOP_CARDS.findIndex(function (card) { return card.turn_id === turnId; });
      if (index >= 0) {
        window.clearTimeout(workshopAutoPlayTimer);
        workshopAutoPlayTimer = null;
        workshopVisibleCards = Math.max(workshopVisibleCards, index + 1);
        renderWorkshopPanel();
        target = document.querySelector('[data-workshop-card="' + cssEscape(turnId) + '"]');
      }
    }
    if (!target) return;
    if (window.innerWidth < 760) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("index-target");
      window.setTimeout(function () { target.classList.remove("index-target"); }, 1200);
    } else {
      scrollMainToElement(root, target);
    }
  }

  function handleWorkshopAction(kind, target) {
    if (kind === "back_to_debate") {
      scrollWorkshopToTurn(target);
      return;
    }
    if (kind === "jump_tag") {
      workshopActive = false;
      delete document.body.dataset.workshop;
      var nextTag = target || "All";
      activeTag = nextTag;
      var expandIds = filteredCases().length ? [filteredCases()[0].id] : [];
      loadResultsShell(nextTag === "All" ? "grid" : "tag", nextTag, expandIds);
      scrollToResults();
      return;
    }
    if (kind === "jump_case") {
      var match = CASES.filter(function (item) { return item.id === target; })[0];
      workshopActive = false;
      delete document.body.dataset.workshop;
      loadResultsShell("grid", "All", match ? [match.id] : []);
      window.setTimeout(function () {
        var details = document.querySelector('[data-case-details="' + cssEscape(target) + '"]');
        scrollMainToElement(mainScrollRoot(), details || qs("case-results"));
      }, 40);
    }
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function startWorkshopAlertPreviewFromHash() {
    if (window.location.hash !== "#workshop-alert") return false;
    window.clearTimeout(typingTimer);
    window.clearTimeout(dotsTimer);
    cancelSpiderLanding();
    conversationState = "landing";
    document.body.dataset.state = "landing";
    activeTag = "All";
    expandedCaseIds = new Set();
    messages = [];
    workshopPreviewShown = false;
    workshopReplayAvailable = true;
    workshopActive = false;
    delete document.body.dataset.workshop;
    setSpiderVisible(false);
    setSpiderLength(0);
    renderWorkshopReplay();
    dispatchConversation({ type: "USER_HI" });
    /* #workshop-alert hash: fire ABOUT after intro + about chips; delay avoids racing USER_HI typing; skip if user already chose. */
    window.setTimeout(function () {
      if (window.location.hash !== "#workshop-alert") return;
      if (conversationState !== "intro_choice") return;
      dispatchConversation({ type: "ABOUT_PICKED", label: chipDisplayLabel(ABOUT_CHIPS[0]) });
      syncTopbarLabel();
    }, 16000);
    syncTopbarLabel();
    syncStoryChrome();
    syncLandingText();
    return true;
  }

  function enterWorkshop() {
    workshopActive = true;
    workshopReplayAvailable = true;
    workshopVisibleCards = 0;
    workshopOpenCards = new Set();
    window.clearTimeout(workshopAutoPlayTimer);
    workshopAutoPlayTimer = null;
    document.body.dataset.workshop = "active";
    renderWorkshopReplay();
    renderWorkshopParticipants();
    renderWorkshopPanel();
    if (workshopAutoPlay) {
      revealWorkshopCards();
    }
    var panel = qs("workshop-panel");
    if (panel) panel.focus();
    syncTopbarLabel();
    syncStoryChrome();
  }

  function exitWorkshop() {
    workshopActive = false;
    window.clearTimeout(workshopAutoPlayTimer);
    workshopAutoPlayTimer = null;
    delete document.body.dataset.workshop;
    var replay = qs("workshop-replay");
    if (replay) replay.focus();
    syncTopbarLabel();
    syncStoryChrome();
  }

  function assistantAvatarSpiderMarkup() {
    var icon = qs("spider-icon");
    if (!icon) return "";
    var vb = icon.getAttribute("viewBox") || "92.415 16.813 115.862 62.992";
    return '<svg class="avatar-spider" viewBox="' + escapeHtml(vb) + '" aria-hidden="true" focusable="false">' + icon.innerHTML + "</svg>";
  }

  function assistantMessage(innerHtml, role, id) {
    return '<div class="message ' + escapeHtml(role || "assistant") + '" data-message-id="' + escapeHtml(id || "") + '"><span class="assistant-avatar" aria-hidden="true">' + assistantAvatarSpiderMarkup() + '</span>' + innerHtml + '</div>';
  }
  function renderMessages() {
    var root = qs("chat-thread");
    if (!root) return;
    var scrollRoot = mainScrollRoot();
    var shouldScroll = isNearBottom(scrollRoot);
    var distanceFromBottom = scrollRoot ? scrollRoot.scrollHeight - scrollRoot.scrollTop : 0;
    root.innerHTML = messages.map(function (message) {
      if (message.kind === "dots") {
        return assistantMessage('<div class="bubble typing-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>', "assistant", message.id);
      }
      if (message.kind === "chips") {
        return '<div class="message user" data-message-id="' + escapeHtml(message.id) + '"><div class="choice-row">' + message.chips.map(renderActionChip).join("") + '</div></div>';
      }
      if (message.kind === "profile") {
        return assistantMessage('<div class="bubble profile-bubble">' + profilePanel() + '</div>', "assistant", message.id);
      }
      if (message.role === "assistant" || message.role === "system") {
        return assistantMessage('<div class="bubble">' + formatMessage(messageBubbleDisplayContent(message)) + '</div>', message.role, message.id);
      }
      return '<div class="message ' + escapeHtml(message.role) + '" data-message-id="' + escapeHtml(message.id) + '"><div class="bubble">' + formatMessage(messageBubbleDisplayContent(message)) + '</div></div>';
    }).join("");
    bindActionButtons(root);
    renderConversationIndex();
    if (scrollRoot) {
      if (shouldScroll) scrollRoot.scrollTop = scrollRoot.scrollHeight;
      else scrollRoot.scrollTop = Math.max(0, scrollRoot.scrollHeight - distanceFromBottom);
    }
  }

  function isNearBottom(el) {
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }

  function renderConversationIndex() {
    var root = qs("conversation-index");
    if (!root) return;
    var items = messages.filter(function (message) {
      return isIndexableMessage(message);
    });
    if (!items.length) {
      root.innerHTML = '<span class="conversation-index-empty">' + escapeHtml(t("conversation starts here", "对话从这里开始")) + '</span>';
      return;
    }
    root.innerHTML = items.map(function (message, index) {
      return '<button type="button" class="conversation-index-item" data-scroll-message="' + escapeHtml(message.id) + '">' +
        '<span>' + String(index + 1).padStart(2, "0") + '</span>' +
        '<strong>' + escapeHtml(indexLabel(message)) + '</strong>' +
        '</button>';
    }).join("");
    bindConversationIndex(root);
  }

  function isIndexableMessage(message) {
    if (!message || message.kind === "dots" || message.kind === "chips") return false;
    return message.role === "assistant" || message.role === "system" || message.kind === "profile";
  }

  function indexLabel(message) {
    if (message.kind === "profile") return t("Profile snapshot", "个人简介");
    var raw = messageBubbleDisplayContent(message);
    var text = String(raw || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    if (!text) return t("Conversation note", "对话备注");
    return text.length > 48 ? text.slice(0, 48).trim() + "..." : text;
  }

  function bindConversationIndex(root) {
    root.querySelectorAll("[data-scroll-message]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-scroll-message");
        var target = null;
        var chat = qs("chat-thread");
        var scrollRoot = mainScrollRoot();
        if (!chat || !scrollRoot) return;
        chat.querySelectorAll("[data-message-id]").forEach(function (messageEl) {
          if (messageEl.getAttribute("data-message-id") === id) target = messageEl;
        });
        if (!target) return;
        root.querySelectorAll(".conversation-index-item").forEach(function (item) {
          item.classList.toggle("active", item === button);
        });
        scrollMainToElement(scrollRoot, target);
      });
    });
  }

  function mainScrollRoot() {
    return document.querySelector(".main-area");
  }

  function scrollMainToElement(scrollRoot, target) {
    if (!scrollRoot || !target) return;
    var top = target.offsetTop - scrollRoot.offsetTop - 8;
    scrollRoot.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    scrollRoot.querySelectorAll(".message.index-target").forEach(function (messageEl) {
      messageEl.classList.remove("index-target");
    });
    target.classList.add("index-target");
    window.setTimeout(function () {
      target.classList.remove("index-target");
    }, 1200);
  }

  function renderInlineFollowUps(chips) {
    var el = qs("results-followup-bot");
    if (!el) return;
    if (!chips || !chips.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = '<div class="inline-followup" aria-label="' + escapeHtml(t("Project actions", "项目操作")) + '"><div class="inline-actions">' + chips.map(renderActionChip).join("") + '</div></div>';
    bindActionButtons(el);
  }

  function renderActionChip(chip) {
    var variant = chip.variant === "secondary" ? " secondary" : "";
    var lab = chipDisplayLabel(chip);
    return '<button type="button" class="choice-chip' + variant + '" aria-label="' + escapeHtml(lab) + '" data-event-type="' + escapeHtml(chip.type) + '" data-event-value="' + escapeHtml(chip.value) + '" data-event-label="' + escapeHtml(lab) + '">' +
      '<span>' + escapeHtml(lab) + '</span>' +
      '</button>';
  }

  function bindActionButtons(root) {
    root.querySelectorAll("[data-event-type]").forEach(function (button) {
      button.addEventListener("click", function () {
        dispatchConversation({
          type: button.getAttribute("data-event-type"),
          value: button.getAttribute("data-event-value"),
          label: button.getAttribute("data-event-label") || ""
        });
      });
    });
  }

  function resultCopy(tag) {
    if (tag === "All") return t("Showing all validated projects.", "全部项目");
    var count = filteredCases().length;
    return t(
      "Showing " + count + " project" + (count === 1 ? "" : "s") + " for " + tag + ". This lens keeps the evidence path narrow; the first match is expanded.",
      tag + "：" + count + " 个项目，首个已展开"
    );
  }

  function filteredCases() {
    if (!activeTag || activeTag === "All") return CASES;
    return CASES.filter(function (item) {
      return item.tags.indexOf(activeTag) !== -1;
    });
  }

  function tagAria(tag) {
    if (tag === "All") return escapeHtml(t("All validated projects", "全部项目"));
    return escapeHtml(t("Filter tag", "筛选标签") + " " + tag.replace(/^#/, ""));
  }

  function renderTags() {
    var root = qs("tag-row");
    if (!root) return;
    root.innerHTML = TAGS.map(function (tag) {
      var active = tag === activeTag || (!activeTag && tag === "All");
      return '<button type="button" class="tag-chip' + (active ? " active" : "") + '" aria-label="' + tagAria(tag) + '" data-tag="' + escapeHtml(tag) + '"><span>' + escapeHtml(tag) + '</span></button>';
    }).join("");
    root.querySelectorAll("[data-tag]").forEach(function (button) {
      button.addEventListener("click", function () {
        dispatchConversation({ type: "TAG_SELECTED", value: button.getAttribute("data-tag") });
      });
    });
  }

  function renderCards() {
    var root = qs("case-results");
    var label = qs("result-label");
    if (!root) return;
    var results = filteredCases();
    document.body.dataset.tagSelected = activeTag ? "true" : "false";
    if (label) {
      if (currentView === "chat") label.textContent = t("About", "关于");
      else if (currentView === "overview") label.textContent = t("Overview", "概览");
      else if (currentView === "split") label.textContent = t("Taxonomy", "标签说明");
      else if (!activeTag) label.textContent = t("Choose a hashtag", "选一个标签");
      else label.textContent = activeTag === "All" ? t("All projects", "全部项目") : activeTag + t(" results", " 结果");
    }

    if (currentView === "chat") {
      root.innerHTML = "";
    } else if (currentView === "overview") {
      root.innerHTML = overviewBlock() + groupedCaseCards(results, function () {
        return false;
      }, true) + '<div id="results-followup-bot"></div>';
    } else if (currentView === "split") {
      root.innerHTML = taxonomyBlock() + groupedCaseCards(results, function (item) {
        return expandedCaseIds.has(item.id);
      }, false) + '<div id="results-followup-bot"></div>';
    } else if (!activeTag && currentView === "tag") {
      root.innerHTML = '<div class="empty-state"><strong>' + escapeHtml(t("Pick a hashtag.", "先选标签，项目卡片才会出现。")) + '</strong><span>' + escapeHtml(t("The project cards appear after the filter choice, so tag mode has a clear job.", "选定标签后才出卡片，避免空转。")) + '</span></div>';
    } else {
      root.innerHTML = groupedCaseCards(results, function (item) {
        return expandedCaseIds.has(item.id);
      }, false) + '<div id="results-followup-bot"></div>';
    }

    root.querySelectorAll("[data-tag-jump]").forEach(function (button) {
      button.addEventListener("click", function () {
        dispatchConversation({ type: "TAG_SELECTED", value: button.getAttribute("data-tag-jump") });
      });
    });
    root.querySelectorAll("[data-case-details]").forEach(function (details) {
      details.addEventListener("toggle", function () {
        dispatchConversation({ type: "CASE_TOGGLED", value: details.getAttribute("data-case-details"), open: details.open });
      });
    });
    bindDemoInteractions(root);
    syncStoryChrome();
  }

  function groupedCaseCards(results, expandedFn, preview) {
    var groups = [
      { category: "analytics", label: t("research work", "研究类项目") },
      { category: "design", label: t("design work", "设计类项目") }
    ];
    return groups.map(function (group) {
      var items = results.filter(function (item) {
        return (item.category || "analytics") === group.category;
      });
      if (!items.length) return "";
      return '<section class="case-group" data-category="' + escapeHtml(group.category) + '">' +
        '<h3 class="case-group-title">' + escapeHtml(group.label) + '</h3>' +
        '<div class="case-results-inner' + (preview ? " preview" : "") + '">' + items.map(function (item) {
          return caseCard(item, expandedFn(item));
        }).join("") + '</div>' +
        '</section>';
    }).join("");
  }

  function scrollToResults() {
    var target = qs("case-results");
    scrollMainToElement(mainScrollRoot(), target);
  }

  function helpBlock() {
    return '<details class="help-block"><summary>?</summary><div class="help-content">' + STARTERS.map(function (chip) {
      return '<div><strong>' + escapeHtml(chipDisplayLabel(chip)) + '</strong><span>' + escapeHtml(chipDisplayHint(chip)) + '</span></div>';
    }).join("") + '</div></details>';
  }

  function overviewBlock() {
    return '<section class="overview-block">' +
      '<div class="overview-copy"><span class="app-kicker">' + escapeHtml(t("overview", "概览")) + '</span><strong>' + PROJECT_COUNT + escapeHtml(t(" projects about the model-world gap.", " 个项目，关于模型与真实世界的偏差。")) + '</strong><p>' + escapeHtml(t(
        "Maps, labels, and AI systems simplify reality. I use spatial data to test when those simplifications change who is visible, searchable, or accountable.",
        "地图、标签、AI 都在简化现实。我用空间数据追问：哪些简化会悄悄改变「谁被看见、谁被搜到、谁被问责」？"
      )) + '</p><p class="overview-hint">' + escapeHtml(t("You can keep browsing by tag or open the full grid.", "你可以继续按标签看，或直接打开全网格。")) + '</p></div>' +
      '<div class="overview-stats">' +
      stat(String(PROJECT_COUNT), t("projects", "个项目")) +
      '</div></section>' + aboutPageBlock() + helpBlock();
  }

  function aboutPageBlock() {
    return '<details class="about-page"><summary>' + escapeHtml(t("about this page", "关于这个页面")) + '</summary><p>' + escapeHtml(t(
      "Built as a small conversation with my own evidence inside it. I use LLMs as thinking partners, vibe-code interfaces, catch bugs, and keep the claims tied to projects I can actually explain.",
      "这是一个内嵌我自己证据的小型对话。我用 LLM 做思考伙伴，vibe-code 界面，抓 bug，确保每个主张都能对应到我真正能解释的项目。"
    )) + '</p></details>';
  }

  function taxonomyBlock() {
    return '<section class="overview-block taxonomy-block">' +
      '<div class="overview-copy"><span class="app-kicker">' + escapeHtml(t("taxonomy", "标签说明")) + '</span><strong>' + escapeHtml(t("Tags are lenses, not folders.", "标签是视角，不是文件夹。")) + '</strong><p>' + escapeHtml(t(
        "A case can support semantic gaps, spatial uncertainty, governance risk, or lived-world design evidence at the same time. That is why tag search fits this portfolio better than a single linear menu.",
        "同一个案例可以同时支撑语义偏差、空间不确定性、治理风险或实地设计证据。所以这里用标签检索，比一条线性菜单更合适。"
      )) + '</p></div>' +
      '<div class="overview-stats">' +
      stat("#spatial_data", tagHint("#spatial_data")) +
      stat("#embedding", tagHint("#embedding")) +
      stat("#platform_governance", tagHint("#platform_governance")) +
      '</div></section>' + helpBlock();
  }

  function stat(value, label) {
    return '<div class="stat-card"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + '</span></div>';
  }

  function profilePanel() {
    return '<section class="profile-panel" aria-label="' + escapeHtml(t("Profile snapshot", "个人简介")) + '">' +
      '<div class="profile-role-row">' +
      PROFILE.roles.map(function (role) {
        return '<span class="profile-role-pill">' + escapeHtml(role.label) + '</span>';
      }).join("") +
      '</div>' +
      '<p class="profile-degree-line"><strong>' + escapeHtml(PROFILE.degree) + ' / ' + escapeHtml(PROFILE.expected) + '</strong></p>' +
      PROFILE.tools.map(function (group) {
        return '<div class="profile-tool-cloud">' +
          group.map(function (tool) {
            return '<span class="profile-tool-tag">' + escapeHtml(String(tool).trim()) + '</span>';
          }).join("") +
          "</div>";
      }).join("") +
      '<p class="profile-languages-text">' +
      PROFILE.languages.map(function (item) {
        var note = portfolioLanguage === "zh" && item.note_zh ? item.note_zh : item.note;
        return escapeHtml(item.lang) + " (" + escapeHtml(note) + ")";
      }).join(" \u00b7 ") +
      "</p>" +
      "</section>";
  }

  function profileLine(label, value) {
    return '<div class="profile-line"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
  }

  function toolRow(label, tools) {
    return '<div class="profile-tool-row"><span>' + escapeHtml(label) + '</span><div>' + tools.map(function (tool) {
      return '<i>' + escapeHtml(tool) + '</i>';
    }).join("") + '</div></div>';
  }

  function caseStory(item) {
    return portfolioLanguage === "zh" && item.story_zh ? item.story_zh : item.story;
  }

  function caseKicker(item) {
    return portfolioLanguage === "zh" && item.kicker_zh ? item.kicker_zh : item.kicker;
  }

  function caseEvidence(item) {
    return portfolioLanguage === "zh" && item.evidence_zh ? item.evidence_zh : item.evidence;
  }

  function caseHighlights(item) {
    return portfolioLanguage === "zh" && item.highlights_zh ? item.highlights_zh : item.highlights;
  }

  function caseProof(item) {
    return portfolioLanguage === "zh" && item.proof_zh ? item.proof_zh : item.proof;
  }

  function caseAnalyticsMeta(item) {
    return portfolioLanguage === "zh" && item.analyticsMeta_zh ? item.analyticsMeta_zh : item.analyticsMeta;
  }

  function caseDesignMeta(item) {
    return portfolioLanguage === "zh" && item.designMeta_zh ? item.designMeta_zh : item.designMeta;
  }

  function caseCard(item, open) {
    return '<article class="case-card">' +
      '<div class="case-head"><span class="case-icon" aria-hidden="true">' + iconSvg(item.iconKey) + '</span><div><span class="case-kicker">' + escapeHtml(caseKicker(item)) + '</span><h2>' + escapeHtml(item.title) + '</h2></div></div>' +
      '<p>' + escapeHtml(caseStory(item)) + '</p>' +
      '<div class="card-tags">' + item.tags.map(function (tag) {
        return '<button type="button" class="tag-chip" aria-label="' + tagAria(tag) + '" data-tag-jump="' + escapeHtml(tag) + '"><span>' + escapeHtml(tag) + '</span></button>';
      }).join("") + '</div>' +
      '<details class="case-details" data-case-details="' + escapeHtml(item.id) + '"' + (open ? " open" : "") + '>' +
      '<summary>' + cardDetailSummary(item) + '</summary>' +
      whyItMattersBlock(item) +
      analyticsMetaBlock(item) +
      designMetaBlock(item) +
      highlightsBlock(item) +
      keyInsightBlock(item) +
      '<div class="mini-demo">' + demoBlock(item.demo) + '</div>' +
      '</details>' +
      '</article>';
  }

  function iconSvg(key) {
    var icons = {
      map: "M5 9l6-3 6 3 6-3v17l-6 3-6-3-6 3V9zm6-3v17m6-14v17",
      tag: "M5 7h11l7 7-9 9-9-9V7zm5 5h.01",
      shield: "M12 4l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V7l8-3zm-3 9l2 2 4-5",
      plan: "M4 6h16v12H4V6zm4 0v12m8-12v12M4 12h16",
      render: "M5 17l4-5 3 3 3-4 4 6H5zm2-8a2 2 0 114 0 2 2 0 01-4 0z"
    };
    var path = icons[key] || icons.map;
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="' + path + '"></path></svg>';
  }

  function highlightsBlock(item) {
    var list = caseHighlights(item);
    return '<div class="case-detail-section">' +
      '<div class="case-section-label">' + escapeHtml(t("takeaways", "要点")) + '</div>' +
      '<div class="highlight-list">' + list.map(function (highlight) {
        return '<span>' + escapeHtml(highlight) + '</span>';
      }).join("") + '</div></div>';
  }

  function cardDetailSummary(item) {
    return item.category === "design"
      ? t("site &middot; plan &middot; render", "场地 · 方案 · 渲染")
      : t("data &middot; workflow &middot; method", "数据 · 流程 · 方法");
  }

  function whyItMattersBlock(item) {
    return '<div class="case-detail-section">' +
      '<div class="case-proof">' +
      '<div class="proof-row"><span>' + escapeHtml(t("why it matters", "为什么重要")) + '</span><strong>' + escapeHtml(caseEvidence(item)) + '</strong></div>' +
      '</div></div>';
  }

  function analyticsMetaBlock(item) {
    var rows = caseAnalyticsMeta(item);
    if (!rows || !rows.length) return "";
    var convention = "";
    if (item.analyticsTermConvention || item.analyticsTermConvention_zh) {
      var convText =
        portfolioLanguage === "zh" && item.analyticsTermConvention_zh
          ? item.analyticsTermConvention_zh
          : item.analyticsTermConvention || item.analyticsTermConvention_zh;
      convention =
        '<p class="analytics-term-convention" role="note">' + escapeHtml(convText) + "</p>";
    }
    return '<div class="case-detail-section analytics-meta-section">' +
      convention +
      '<div class="case-section-label">' + escapeHtml(t("technical depth", "技术细节")) + '</div>' +
      '<div class="analytics-meta">' + rows.map(function (row) {
        return '<div class="analytics-meta-item"><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>';
      }).join("") + '</div></div>';
  }

  function designMetaBlock(item) {
    var rows = caseDesignMeta(item);
    if (!rows || !rows.length) return "";
    return '<div class="case-detail-section design-meta-section">' +
      '<div class="case-section-label">' + escapeHtml(t("site plan render", "场地 · 方案 · 渲染")) + '</div>' +
      '<div class="analytics-meta design-meta">' + rows.map(function (row) {
        return '<div class="analytics-meta-item"><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>';
      }).join("") + '</div></div>';
  }

  function keyInsightBlock(item) {
    var proofRows = caseProof(item);
    return '<div class="case-detail-section">' +
      '<div class="case-section-label">' + escapeHtml(t("key insight", "核心发现")) + '</div>' +
      '<div class="case-proof">' +
      proofRows.map(function (row) {
        return '<div class="proof-row"><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>';
      }).join("") +
      '</div></div>';
  }

  function demoBlock(type) {
    if (type === "maup") {
      return '<div class="maup-demo" data-radius="500">' +
        '<button class="radius-btn" type="button" data-action="maup-toggle">' + escapeHtml(t("What if the buffer radius changes to 1000 m?", "缓冲半径改成 1000 m 会怎样？")) + '</button>' +
        '<div class="maup-bars">' +
        '<div class="maup-bar-row">' +
        '<div class="bar-label"><span>' + escapeHtml(t("poor-unit share", "贫困单元占比")) + '</span><strong class="maup-val">76.3%</strong></div>' +
        '<div class="bar-track"><span class="bar-fill maup-fill"></span></div>' +
        '</div>' +
        '</div>' +
        '<p class="maup-demo-copy">' + escapeHtml(t("Same city, different radius, different food-access story.", "同一座城市，不同半径，不同的食物可达性。")) + '</p>' +
        '<p class="maup-note" aria-live="polite"></p>' +
        '<figure class="maup-panel-figure">' +
        '<img src="assets/maup-ugcop-subzone-panel.png" alt="Singapore subzone grid comparing UGCoP at 500 m versus 1000 m context radius. Metric S_u = H divided by H plus C for hawker-centre POIs versus chain POIs." loading="lazy" decoding="async" />' +
        '<figcaption class="maup-panel-caption">Subzone extent &middot; UGCoP buffer ladder (500 m vs 1000 m) &middot; S<sub>u</sub> = H/(H+C), hawker vs chain</figcaption>' +
        '</figure>' +
        '</div>';
    }
    if (type === "poi") {
      return '<div class="label-compare"><span>' + escapeHtml(t("Map: Bar", "地图：酒吧")) + '</span><span>' + escapeHtml(t("Content: Livehouse", "内容：Livehouse")) + '</span><span>' + escapeHtml(t("Ticketing: Performance venue", "票务：演出场地")) + '</span></div>';
    }
    if (type === "xiazhuang") {
      return '<div class="demo-bim-tm" role="group" aria-label="Xiazhuang Twinmotion stills">' +
        '<figure><img src="assets/xiazhuang-layout.png" alt="Xiazhuang village shaded massing layout in Twinmotion" loading="lazy" width="280" height="158" /></figure>' +
        '<figure><img src="assets/xiazhuang-atmosphere.png" alt="Xiazhuang village photoreal atmospheric bird-eye render" loading="lazy" width="280" height="158" /></figure>' +
        "</div>";
    }
    if (type === "huijing") {
      return '<div class="demo-huijing" role="group" aria-label="Huijing Huayuan posters and Twinmotion thumbnails">' +
        '<div class="demo-huijing-posters">' +
        '<figure><img src="assets/huijing-poster-1.web.jpg" alt="Huijing Huayuan design presentation board one" loading="lazy" decoding="async" width="1271" height="1800" /></figure>' +
        '<figure><img src="assets/huijing-poster-2.web.jpg" alt="Huijing Huayuan planning analysis board two" loading="lazy" decoding="async" width="1271" height="1800" /></figure>' +
        "</div>" +
        '<div class="demo-huijing-thumbs" role="list">' +
        '<figure role="listitem"><img src="assets/huijing-entrance.png" alt="Twinmotion entrance at dusk in rain" loading="lazy" decoding="async" /></figure>' +
        '<figure role="listitem"><img src="assets/huijing-riverside.web.jpg" alt="Twinmotion riverside view and skyline" loading="lazy" decoding="async" width="1600" /></figure>' +
        "</div>" +
        "</div>";
    }
    return '<div class="control-list"><span>' + escapeHtml(t("disclosure", "披露")) + '</span><span>' + escapeHtml(t("place-aware impact", "地点相关影响")) + '</span><span>' + escapeHtml(t("contestability", "可争辩性")) + '</span><span>' + escapeHtml(t("spatial data governance", "空间数据治理")) + '</span></div>';
  }

  function bindDemoInteractions(root) {
    root.querySelectorAll("[data-action='maup-toggle']").forEach(function (button) {
      button.addEventListener("click", function () {
        var demo = button.closest(".maup-demo");
        if (!demo) return;
        var is500 = demo.dataset.radius === "500";
        demo.dataset.radius = is500 ? "1000" : "500";
        button.textContent = is500 ? t("Switch back to 500 m radius", "切回 500 m") : t("What if the buffer radius changes to 1000 m?", "缓冲半径改成 1000 m 会怎样？");
        var valEl = demo.querySelector(".maup-val");
        animateDecimal(valEl, is500 ? 76.3 : 55.9, is500 ? 55.9 : 76.3, 900);
        var note = demo.querySelector(".maup-note");
        if (!note) return;
        if (is500) {
          window.setTimeout(function () {
            note.textContent = t("165 planning units changed classification from a single buffer shift.", "仅一个缓冲半径调整，165 个规划单元改了分类。");
            note.classList.add("visible");
          }, 600);
        } else {
          note.classList.remove("visible");
        }
      });
    });
  }

  function animateDecimal(el, from, to, duration) {
    if (!el) return;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = (from + (to - from) * ease).toFixed(1) + "%";
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function formatMessage(text) {
    return escapeHtml(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function bindChrome() {
    var hiBubble = qs("hi-bubble");
    var backLanding = qs("back-landing");
    if (hiBubble) {
      hiBubble.addEventListener("click", function () {
        dispatchConversation({ type: "USER_HI" });
      });
    }
    var langToggle = qs("lang-toggle");
    if (langToggle) {
      langToggle.addEventListener("click", function () {
        togglePortfolioLanguage();
      });
    }
    var langToggleLanding = qs("lang-toggle-landing");
    if (langToggleLanding) {
      langToggleLanding.addEventListener("click", function () {
        togglePortfolioLanguage();
      });
    }
    if (backLanding) {
      backLanding.addEventListener("click", function () {
        if (workshopActive) {
          exitWorkshop();
          return;
        }
        conversationState = "landing";
        window.clearTimeout(typingTimer);
        window.clearTimeout(dotsTimer);
        document.body.dataset.state = "landing";
        messages = [];
        activeTag = "All";
        expandedCaseIds = new Set();
        closeWorkshopAlert();
        workshopPreviewShown = false;
        workshopAlertSeen = false;
        workshopReplayAvailable = false;
        workshopActive = false;
        workshopVisibleCards = 0;
        window.clearTimeout(workshopAutoPlayTimer);
        workshopAutoPlayTimer = null;
        delete document.body.dataset.workshop;
        renderWorkshopReplay();
        setView("chat");
        syncFollowUps([]);
        renderMessages();
        renderTags();
        renderCards();
        resetLandingSpider();
        syncTopbarLabel();
        syncStoryChrome();
        syncLandingText();
      });
    }
    var workshopSkip = qs("workshop-skip");
    if (workshopSkip) {
      workshopSkip.addEventListener("click", function () {
        if (document.body.dataset.state === "landing") {
          cancelSpiderLanding();
          conversationState = "overview";
          messages = [];
          activeTag = "All";
          expandedCaseIds = new Set();
          retractSpider();
          document.body.dataset.state = "story";
          loadResultsShell("overview", "All", []);
          renderMessages();
          syncTopbarLabel();
          syncStoryChrome();
        }
        openWorkshopAlert({ force: true });
      });
    }
  }

  function injectContactLinks() {
    var rail = document.querySelector(".rail-mini");
    if (!rail || !PROFILE.contact || !PROFILE.contact.github) return;
    if (rail.querySelector('[data-contact="github"]')) return;
    var raw = String(PROFILE.contact.github).trim();
    if (!raw) return;
    var link = document.createElement("a");
    link.href = /^https?:\/\//.test(raw) ? raw : "https://" + raw;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("data-contact", "github");
    link.textContent = raw;
    rail.appendChild(link);
  }

  function boot() {
    initPortfolioLanguageFromDom();
    syncLandingText();
    bindChrome();
    injectContactLinks();
    bindWorkshopAlert();
    if (startWorkshopAlertPreviewFromHash()) return;
    setView("chat");
    syncFollowUps([]);
    renderTags();
    renderCards();
    resetLandingSpider();
    startTyping();
    window.setTimeout(function () {
      qs("hero-sub").classList.add("show");
      qs("hi-area").classList.add("show");
    }, 1300);
    window.addEventListener("resize", function () {
      if (document.body.dataset.state === "landing") {
        cancelSpiderLanding();
        setSpiderLength(window.innerHeight * SPIDER_SPRING.targetVh);
      } else {
        setSpiderLength(0);
      }
    });
    syncTopbarLabel();
    syncStoryChrome();
  }

  document.addEventListener("DOMContentLoaded", boot);
}());
