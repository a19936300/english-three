// PETS-3（公共英语三级）真题模拟练习数据
// 考试结构：听力25题(30%) / 语法20题(15%) / 阅读20题(30%) / 写作2篇(25%)
// 满分100分，60分合格。本数据聚焦笔试部分：语法、阅读、完形填空。
// 面向英语接近零基础的备考者，题目由易到难、解析详尽。

export const examLevels = [
  // ===================== 第1关：语法选择 · 基础篇 =====================
  {
    id: 1,
    title: "语法选择 · 基础篇",
    description: "PETS-3常考基础语法选择题练习",
    icon: "📝",
    color: "#ce82ff",
    type: "grammar",
    questions: [
      {
        question: "She ___ to school every day.",
        options: ["walk", "walks", "walking", "walked"],
        answer: 1,
        explanation: "主语She是第三人称单数，一般现在时动词要加s，选walks。"
      },
      {
        question: "There ___ a book on the desk.",
        options: ["is", "are", "be", "were"],
        answer: 0,
        explanation: "There be句型就近原则，a book是单数，用is，选is。"
      },
      {
        question: "My brother is ___ than me.",
        options: ["tall", "taller", "tallest", "more tall"],
        answer: 1,
        explanation: "than表示比较，用比较级。tall变taller（双写l加er），选taller。"
      },
      {
        question: "I ___ my homework yesterday.",
        options: ["do", "did", "done", "doing"],
        answer: 1,
        explanation: "yesterday昨天，用一般过去时，do的过去式是did，选did。"
      },
      {
        question: "___ beautiful the flower is!",
        options: ["What", "What a", "How", "How a"],
        answer: 2,
        explanation: "感叹句两种结构：How+形容词+主谓 / What(a)+名词+主谓。这里beautiful是形容词直接跟主谓，选How。"
      },
      {
        question: "She has lived here ___ 2010.",
        options: ["for", "since", "in", "from"],
        answer: 1,
        explanation: "现在完成时+时间段：for+时间段（如for 5 years），since+时间点（如since 2010）。2010是时间点，选since。"
      },
      {
        question: "The book ___ by many students.",
        options: ["reads", "is read", "is reading", "read"],
        answer: 1,
        explanation: "书被读，用被动语态。一般现在时被动是am/is/are+过去分词，book单数用is read，选is read。"
      },
      {
        question: "Would you like ___ coffee?",
        options: ["some", "any", "many", "much"],
        answer: 0,
        explanation: "Would you like...是委婉提议/请求，期待肯定回答，用some不用any，选some。"
      },
      {
        question: "He is interested in ___ basketball.",
        options: ["play", "playing", "played", "to play"],
        answer: 1,
        explanation: "be interested in中in是介词，后接动名词doing，选playing。"
      },
      {
        question: "___ is raining outside.",
        options: ["It", "There", "This", "That"],
        answer: 0,
        explanation: "谈论天气用It作主语：It is raining（下雨了），选It。"
      }
    ]
  },

  // ===================== 第2关：语法选择 · 进阶篇 =====================
  {
    id: 2,
    title: "语法选择 · 进阶篇",
    description: "PETS-3常考进阶语法选择题练习",
    icon: "📝",
    color: "#4d9fff",
    type: "grammar",
    questions: [
      {
        question: "If it ___ tomorrow, we will stay at home.",
        options: ["rain", "rains", "will rain", "rained"],
        answer: 1,
        explanation: "真实条件句（主将从现）：主句will stay用将来时，if从句用一般现在时表将来，it单数加s，选rains。"
      },
      {
        question: "The teacher asked me ___ I had done my homework.",
        options: ["that", "if", "what", "which"],
        answer: 1,
        explanation: "宾语从句表是否，由一般疑问句变来用if/whether引导，选if。"
      },
      {
        question: "By the time he arrived, the train ___.",
        options: ["left", "has left", "had left", "was leaving"],
        answer: 2,
        explanation: "By the time+过去时，主句用过去完成时had done，表示在到达之前火车已离开，选had left。"
      },
      {
        question: "Not until he finished his work ___ go home.",
        options: ["he did", "did he", "he", "does he"],
        answer: 1,
        explanation: "Not until置于句首，主句部分倒装（助动词提前）。过去时借助did，选did he。"
      },
      {
        question: "The man ___ is talking to our teacher is my father.",
        options: ["who", "which", "whom", "whose"],
        answer: 0,
        explanation: "定语从句修饰人，先行词the man作从句主语（is talking），用who，选who。"
      },
      {
        question: "I would rather you ___ tell anyone about this.",
        options: ["don't", "didn't", "won't", "haven't"],
        answer: 1,
        explanation: "would rather后接从句用虚拟语气，对现在/将来虚拟用过去式，选didn't。"
      },
      {
        question: "Hardly ___ when the phone rang.",
        options: ["I had arrived", "had I arrived", "I arrived", "did I arrive"],
        answer: 1,
        explanation: "Hardly...when...句型，Hardly置于句首主句部分倒装，且与过去完成时连用，选had I arrived。"
      },
      {
        question: "The cake smells ___.",
        options: ["well", "good", "nicely", "badly"],
        answer: 1,
        explanation: "smell是感官连系动词，后接形容词作表语。well作形容词指身体好，此处用good，选good。"
      },
      {
        question: "___ of the two boys is taller?",
        options: ["Who", "Which", "What", "Whose"],
        answer: 1,
        explanation: "在两者之间做选择用which，选Which。"
      },
      {
        question: "She suggested that he ___ a doctor.",
        options: ["sees", "see", "saw", "seeing"],
        answer: 1,
        explanation: "suggest后的宾语从句用虚拟语气should+动词原形，should可省略，选see。"
      }
    ]
  },

  // ===================== 第3关：阅读理解 · 基础篇 =====================
  {
    id: 3,
    title: "阅读理解 · 基础篇",
    description: "PETS-3阅读理解入门练习",
    icon: "📝",
    color: "#5acc8a",
    type: "reading",
    passage: "Mr. Smith is a teacher in a middle school. He teaches English. Every morning, he gets up at 6:30 and goes to school by bus. His students like him very much because his classes are always interesting. On weekends, he likes to read books and play basketball with his friends.",
    passageCn: "Mr. Smith是一所中学的老师。他教英语。每天早上，他6:30起床坐公交车去学校。他的学生非常喜欢他，因为他的课总是很有趣。周末，他喜欢读书和跟朋友打篮球。",
    questions: [
      {
        question: "What does Mr. Smith teach?",
        options: ["Math", "English", "Chinese", "Science"],
        answer: 1,
        explanation: "原文说\"He teaches English\"（他教英语），选English。"
      },
      {
        question: "How does Mr. Smith go to school?",
        options: ["By car", "By bus", "By bike", "On foot"],
        answer: 1,
        explanation: "原文说\"goes to school by bus\"（坐公交去学校），选By bus。"
      },
      {
        question: "What time does he get up?",
        options: ["6:00", "6:30", "7:00", "7:30"],
        answer: 1,
        explanation: "原文说\"gets up at 6:30\"（6:30起床），选6:30。"
      },
      {
        question: "Why do students like him?",
        options: ["He is handsome", "His classes are interesting", "He gives good grades", "He is very strict"],
        answer: 1,
        explanation: "原文说\"because his classes are always interesting\"（因为他的课总是很有趣），选His classes are interesting。"
      },
      {
        question: "What does he do on weekends?",
        options: ["Watches TV", "Goes shopping", "Reads books and plays basketball", "Sleeps all day"],
        answer: 2,
        explanation: "原文说\"he likes to read books and play basketball\"（喜欢读书和打篮球），选Reads books and plays basketball。"
      }
    ]
  },

  // ===================== 第4关：阅读理解 · PETS-3篇 =====================
  {
    id: 4,
    title: "阅读理解 · PETS-3篇",
    description: "PETS-3难度阅读理解练习",
    icon: "📝",
    color: "#ff8c5a",
    type: "reading",
    passage: "Many people think that breakfast is the most important meal of the day. Studies show that people who eat breakfast every morning tend to be healthier than those who don't. When you skip breakfast, your body has to work harder to get energy, which may make you feel tired and hungry later in the day. Children who eat breakfast regularly usually do better in school. They can pay more attention in class and remember things more easily. So, no matter how busy you are, try to spend a few minutes having a healthy breakfast every day.",
    passageCn: "许多人认为早餐是一天中最重要的一餐。研究表明，每天早上吃早餐的人往往比不吃的人更健康。当你不吃早餐时，你的身体不得不更费力地获取能量，这可能让你在当天晚些时候感到疲倦和饥饿。经常吃早餐的孩子通常在学校表现更好。他们能在课堂上更加专注，也更容易记住东西。所以，无论你多忙，都尽量每天花几分钟吃一顿健康的早餐。",
    questions: [
      {
        question: "According to the passage, what is the most important meal of the day?",
        options: ["Lunch", "Dinner", "Breakfast", "Supper"],
        answer: 2,
        explanation: "首句\"breakfast is the most important meal of the day\"（早餐是一天中最重要的一餐），选Breakfast。"
      },
      {
        question: "What does \"skip breakfast\" mean?",
        options: ["Eat too much breakfast", "Not eat breakfast", "Have a big breakfast", "Cook breakfast"],
        answer: 1,
        explanation: "skip意为跳过、略过，skip breakfast即不吃早餐，选Not eat breakfast。"
      },
      {
        question: "How does skipping breakfast make people feel?",
        options: ["Energetic", "Tired and hungry", "Happy", "Relaxed"],
        answer: 1,
        explanation: "原文\"make you feel tired and hungry\"（让你感到疲倦和饥饿），选Tired and hungry。"
      },
      {
        question: "Why do children who eat breakfast do better in school?",
        options: ["They are taller", "They can pay more attention", "They have more friends", "They get better grades automatically"],
        answer: 1,
        explanation: "原文\"They can pay more attention in class\"（他们能在课堂上更加专注），选They can pay more attention。"
      },
      {
        question: "What does the passage suggest we do?",
        options: ["Skip breakfast when busy", "Never eat breakfast", "Have a healthy breakfast every day", "Only eat breakfast on weekends"],
        answer: 2,
        explanation: "末句\"try to spend a few minutes having a healthy breakfast every day\"（尽量每天花几分钟吃健康早餐），选Have a healthy breakfast every day。"
      }
    ]
  },

  // ===================== 第5关：完形填空 =====================
  {
    id: 5,
    title: "完形填空",
    description: "综合语法与词汇填空练习",
    icon: "📝",
    color: "#ffc857",
    type: "cloze",
    passage: "Tom is a 1 boy. He 2 in a small town with his parents. Every day he 3 to school by bike. His favorite 4 is English. He thinks it is 5 . His English teacher, Miss Wang, is very 6 to her students. She often tells them 7 to learn English well. Tom studies hard 8 he wants to be a teacher in the future. He believes that 9 he works hard enough, his dream will 10 true.",
    passageCn: "Tom是一个1男孩。他和父母2在一个小镇。每天他3骑自行车去学校。他最喜欢的4是英语。他认为它很5。他的英语老师王老师对她的学生非常6。她经常告诉他们7学好英语。Tom努力学习，8他想将来成为一名老师。他相信，9他足够努力，他的梦想就会10成真。",
    questions: [
      {
        blank: 1,
        question: "选择填入第1空",
        options: ["twelve year old", "twelve years old", "twelve-years-old", "twelve-year-old"],
        answer: 3,
        explanation: "作定语的复合形容词用连字符连接，且year用单数，即twelve-year-old boy，选twelve-year-old。"
      },
      {
        blank: 2,
        question: "选择填入第2空",
        options: ["live", "lives", "lived", "living"],
        answer: 1,
        explanation: "主语He第三人称单数，一般现在时动词加s，选lives。"
      },
      {
        blank: 3,
        question: "选择填入第3空",
        options: ["go", "goes", "went", "going"],
        answer: 1,
        explanation: "Every day表经常性动作用一般现在时，he单数加es，选goes。"
      },
      {
        blank: 4,
        question: "选择填入第4空",
        options: ["sport", "color", "subject", "food"],
        answer: 2,
        explanation: "后文说English，English是一门学科(subject)，选subject。"
      },
      {
        blank: 5,
        question: "选择填入第5空",
        options: ["boring", "difficult", "interesting", "bad"],
        answer: 2,
        explanation: "favorite说明喜欢，应配正面评价，选interesting（有趣的）。"
      },
      {
        blank: 6,
        question: "选择填入第6空",
        options: ["strict", "kind", "angry", "cold"],
        answer: 1,
        explanation: "be kind to sb.对某人和善，符合好老师形象，选kind。"
      },
      {
        blank: 7,
        question: "选择填入第7空",
        options: ["what", "why", "how", "when"],
        answer: 2,
        explanation: "告诉他们如何(how)学好英语，how to do sth.结构，选how。"
      },
      {
        blank: 8,
        question: "选择填入第8空",
        options: ["so", "but", "because", "or"],
        answer: 2,
        explanation: "努力学习是因为想当老师，表因果关系，选because。"
      },
      {
        blank: 9,
        question: "选择填入第9空",
        options: ["if", "when", "because", "although"],
        answer: 0,
        explanation: "条件句\"如果他足够努力\"，主句will come true用将来时，if引导真实条件句，选if。"
      },
      {
        blank: 10,
        question: "选择填入第10空",
        options: ["become", "come", "go", "make"],
        answer: 1,
        explanation: "固定搭配come true（实现），梦想成真，选come。"
      }
    ]
  }
];
