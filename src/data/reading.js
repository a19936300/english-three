// PETS-3 阅读理解练习数据
// 难度递增：从简短对话到 PETS-3 真题难度
// 适用于英语接近零基础、备考 PETS-3 的学习者

export const readingLevels = [
  {
    id: 1,
    title: "阅读入门 · 对话理解",
    description: "简短日常对话理解练习",
    icon: "📚",
    color: "#ff9600",
    passage:
      "A: Excuse me, does bus No. 5 stop here?\nB: Yes, it does. It comes every ten minutes.\nA: Thank you. When is the next bus?\nB: It should be here in about five minutes.",
    passageCn:
      "A：打扰一下，5路公交车在这里停靠吗？\nB：是的，停的。每十分钟一班。\nA：谢谢。下一班车什么时候到？\nB：大约五分钟后就到。",
    questions: [
      {
        question: "What is the man asking about at first?",
        options: [
          "The price of the ticket",
          "Whether bus No. 5 stops here",
          "The way to the station",
          "The time of the last bus",
        ],
        answer: 1,
        explanation:
          'A第一句问"does bus No. 5 stop here?"，问的是5路公交车是否在此停靠，所以选第二个选项。',
      },
      {
        question: "How often does bus No. 5 come?",
        options: [
          "Every 5 minutes",
          "Every 10 minutes",
          "Every 15 minutes",
          "Every 20 minutes",
        ],
        answer: 1,
        explanation:
          'B说"It comes every ten minutes"，即每十分钟一班，所以选10分钟。',
      },
      {
        question: "How long will the man wait for the next bus?",
        options: [
          "About 5 minutes",
          "About 10 minutes",
          "About 15 minutes",
          "About 20 minutes",
        ],
        answer: 0,
        explanation:
          'B说"It should be here in about five minutes"，所以大约要等5分钟，选第一个。',
      },
    ],
  },
  {
    id: 2,
    title: "基础阅读 · 我的一天",
    description: "日常生活短文理解（约60词）",
    icon: "☀️",
    color: "#34c759",
    passage:
      "My name is Li Ming. I am a student. I get up at six thirty every morning. After breakfast, I go to school by bike. My school is not far from my home. It takes about fifteen minutes. Classes begin at eight. I have lunch at school with my classmates. In the evening, I do my homework and go to bed at ten.",
    passageCn:
      "我叫李明。我是一名学生。我每天早上六点半起床。吃完早饭后，我骑自行车上学。我的学校离家不远。大约需要十五分钟。八点开始上课。我在学校跟同学一起吃午饭。晚上，我做作业，十点上床睡觉。",
    questions: [
      {
        question: "How does Li Ming go to school?",
        options: ["By bus", "By bike", "On foot", "By car"],
        answer: 1,
        explanation: '文中明确说"I go to school by bike"，所以骑车上学，选第二个。',
      },
      {
        question: "How long does it take Li Ming to get to school?",
        options: [
          "About 5 minutes",
          "About 10 minutes",
          "About 15 minutes",
          "About 30 minutes",
        ],
        answer: 2,
        explanation:
          '文中说"It takes about fifteen minutes"，即大约需要十五分钟，选第三个。',
      },
      {
        question: "What time does Li Ming go to bed?",
        options: ["At 8:00", "At 9:00", "At 10:00", "At 11:00"],
        answer: 2,
        explanation: '文中最后说"go to bed at ten"，即十点睡觉，选第三个。',
      },
    ],
  },
  {
    id: 3,
    title: "实用阅读 · 图书馆通知",
    description: "通知便条类短文理解",
    icon: "📝",
    color: "#007aff",
    passage:
      "NOTICE\nThe school library will be closed next Monday, May 15th, for cleaning. Please return all your borrowed books before this Friday. If you need to use a library during this time, please go to the City Library on Main Street. It is open from 9:00 a.m. to 5:00 p.m. every day. You can take bus No. 12 to get there. The school library will reopen on Tuesday. Thank you for your cooperation.\nThe Library Office",
    passageCn:
      "通知\n学校图书馆将于下周一（5月15日）因打扫卫生而关闭。请在本周五之前归还所有借阅的图书。在此期间如需使用图书馆，请前往主街的市图书馆。它每天上午9:00至下午5:00开放。您可以乘坐12路公交车到达那里。学校图书馆将于周二重新开放。感谢您的配合。\n图书馆办公室",
    questions: [
      {
        question: "Why will the school library be closed?",
        options: [
          "For a holiday",
          "For cleaning",
          "For repair work",
          "For a meeting",
        ],
        answer: 1,
        explanation:
          '通知中说"will be closed...for cleaning"，即因打扫卫生关闭，选第二个。',
      },
      {
        question: "When will the school library reopen?",
        options: ["On Friday", "On Monday", "On Tuesday", "Next week"],
        answer: 2,
        explanation:
          '通知最后说"The school library will reopen on Tuesday"，所以周二重新开放，选第三个。',
      },
      {
        question: "How can students get to the City Library?",
        options: [
          "By bus No. 5",
          "By bus No. 12",
          "On foot",
          "By bike",
        ],
        answer: 1,
        explanation:
          '通知中提到"You can take bus No. 12 to get there"，所以可乘坐12路公交车，选第二个。',
      },
    ],
  },
  {
    id: 4,
    title: "进阶阅读 · 自行车在中国",
    description: "说明文理解（约105词）",
    icon: "🚲",
    color: "#5856d6",
    passage:
      "Bicycles are very popular in China. Many people ride bikes to work or school every day. There are several reasons for this. First, riding a bike is good exercise. It helps people stay healthy. Second, bikes are cheap. Most families can afford one. Third, bikes do not need gas, so they are good for the environment. However, riding a bike in the city can be dangerous. There are many cars and buses on the road. People must follow traffic rules and be careful. Today, more and more young people prefer to use shared bikes. They can find a bike easily with their phones and return it anywhere.",
    passageCn:
      "自行车在中国非常普及。许多人每天骑车上班或上学。这有几个原因。第一，骑自行车是很好的锻炼，有助于人们保持健康。第二，自行车便宜，大多数家庭都买得起。第三，自行车不需要汽油，所以对环境友好。然而，在城市里骑车可能很危险，路上有许多汽车和公交车。人们必须遵守交通规则并保持小心。如今，越来越多的年轻人更喜欢使用共享单车。他们可以用手机轻松找到一辆自行车，并能在任何地方归还。",
    questions: [
      {
        question: "How many reasons for the popularity of bikes are mentioned?",
        options: ["Two", "Three", "Four", "Five"],
        answer: 1,
        explanation:
          '文中用"First""Second""Third"列出了三个原因：健康运动、便宜、环保，所以选Three（第二个）。',
      },
      {
        question: "Why are bikes good for the environment?",
        options: [
          "They are cheap",
          "They are quiet",
          "They do not need gas",
          "They are fast",
        ],
        answer: 2,
        explanation:
          '文中说"bikes do not need gas, so they are good for the environment"，所以不需要汽油，选第三个。',
      },
      {
        question: "What should bike riders do to stay safe in the city?",
        options: [
          "Ride slowly",
          "Follow traffic rules and be careful",
          "Wear bright clothes",
          "Ride on small roads only",
        ],
        answer: 1,
        explanation:
          '文中说"People must follow traffic rules and be careful"，所以要遵守交通规则并小心，选第二个。',
      },
      {
        question: "How do young people find shared bikes?",
        options: [
          "By asking friends",
          "With their phones",
          "At bike shops",
          "By calling a number",
        ],
        answer: 1,
        explanation:
          '文中说"They can find a bike easily with their phones"，所以用手机找车，选第二个。',
      },
    ],
  },
  {
    id: 5,
    title: "故事阅读 · 北京之旅",
    description: "故事类短文理解（约124词）",
    icon: "✈️",
    color: "#ff2d55",
    passage:
      "Last summer, Tom went to Beijing with his parents. They went there by train. It was his first time visiting the capital city. On the first day, they went to Tian'anmen Square and the Palace Museum. Tom was excited to see so many old buildings. The next day, they climbed the Great Wall. It was a long way up, but Tom made it to the top. He felt very proud of himself. On the third day, they tried some famous Beijing food. Tom liked the roast duck the most. They also bought some gifts for their friends back home. The trip lasted five days. When they came back, Tom told his friends all about the wonderful journey. He hopes to visit Beijing again someday.",
    passageCn:
      "去年夏天，汤姆和父母一起去了北京。他们坐火车去的那里。这是他第一次游览首都。第一天，他们去了天安门广场和故宫。汤姆看到这么多古建筑，非常兴奋。第二天，他们爬了长城。路很长，但汤姆爬到了顶端，他为自己感到非常自豪。第三天，他们品尝了一些著名的北京美食。汤姆最喜欢北京烤鸭。他们还给家里的朋友买了一些礼物。这次旅行持续了五天。回来后，汤姆把这段美妙的旅程告诉了朋友们。他希望有一天能再游北京。",
    questions: [
      {
        question: "How did Tom and his parents travel to Beijing?",
        options: ["By plane", "By train", "By bus", "By car"],
        answer: 1,
        explanation: '文中说"They went there by train"，所以坐火车去，选第二个。',
      },
      {
        question: "What did Tom like the most during the trip?",
        options: [
          "The Great Wall",
          "The Palace Museum",
          "Beijing roast duck",
          "The old buildings",
        ],
        answer: 2,
        explanation:
          '文中说"Tom liked the roast duck the most"，所以最喜欢北京烤鸭，选第三个。',
      },
      {
        question: "How did Tom feel after climbing the Great Wall?",
        options: [
          "Tired and bored",
          "Very proud of himself",
          "Disappointed",
          "A little afraid",
        ],
        answer: 1,
        explanation:
          '文中说"He felt very proud of himself"，所以他感到很自豪，选第二个。',
      },
      {
        question: "How long did the trip last?",
        options: ["Three days", "Four days", "Five days", "A week"],
        answer: 2,
        explanation: '文中说"The trip lasted five days"，所以持续五天，选第三个。',
      },
    ],
  },
  {
    id: 6,
    title: "PETS-3 模拟 · 网购的利与弊",
    description: "PETS-3真题难度阅读（约156词）",
    icon: "🛒",
    color: "#af52de",
    passage:
      "In recent years, online shopping has become more and more popular in China. People can buy almost everything on the Internet, from books and clothes to food and electronics. There are many reasons why people prefer online shopping. First, it is very convenient. People can shop at home at any time of the day. They don't need to go out and wait in line. Second, things online are usually cheaper than those in stores. Shoppers can compare prices from different sellers easily. Third, online stores often have a wider range of products. However, online shopping also has some problems. People cannot see or touch the real things before buying them. Sometimes the quality is not as good as expected. Besides, returning goods can be troublesome. Moreover, some people buy things they don't really need because it is so easy to click and pay. Experts suggest that shoppers should think carefully before buying and choose reliable sellers.",
    passageCn:
      "近年来，网购在中国变得越来越流行。人们几乎可以在网上买到一切，从书和衣服到食品和电子产品。人们更喜欢网购有很多原因。第一，它非常方便。人们可以在一天中的任何时间在家购物，不需要出门排队。第二，网上的东西通常比实体店便宜，购物者可以轻松比较不同卖家的价格。第三，网店通常有更丰富的商品种类。然而，网购也有一些问题。人们在购买前无法看到或触摸到实物，有时质量不如预期。此外，退货可能很麻烦。而且，有些人因为点击付款太容易，会买一些并不是真正需要的东西。专家建议购物者在购买前应仔细思考，并选择可靠的卖家。",
    questions: [
      {
        question: "What is the main idea of the passage?",
        options: [
          "Online shopping is always good",
          "Online shopping is popular but has problems",
          "People should stop shopping online",
          "Stores are better than online shops",
        ],
        answer: 1,
        explanation:
          "文章既讲了网购流行的原因和好处，也讲了它存在的问题，整体是客观介绍网购的利与弊，所以选第二个。",
      },
      {
        question: "Which of the following is NOT an advantage of online shopping?",
        options: [
          "It is convenient",
          "Things are cheaper",
          "A wider range of products",
          "People can touch the goods before buying",
        ],
        answer: 3,
        explanation:
          '文中说"People cannot see or touch the real things before buying them"，无法触摸实物是缺点而非优点，所以选第四个。',
      },
      {
        question: "Why do some people buy things they don't really need?",
        options: [
          "Because things are very cheap",
          "Because it is so easy to click and pay",
          "Because sellers tell them to",
          "Because of advertisements",
        ],
        answer: 1,
        explanation:
          "文中说“some people buy things they don't really need because it is so easy to click and pay”，所以因为点击付款太容易，选第二个。",
      },
      {
        question: "What does the passage say about returning goods?",
        options: [
          "It is easy",
          "It is free",
          "It can be troublesome",
          "It is not allowed",
        ],
        answer: 2,
        explanation:
          '文中说"returning goods can be troublesome"，即退货可能很麻烦，选第三个。',
      },
      {
        question: "What do experts suggest shoppers do?",
        options: [
          "Buy only cheap things",
          "Shop only in stores",
          "Think carefully and choose reliable sellers",
          "Never buy food online",
        ],
        answer: 2,
        explanation:
          '文章最后说"Experts suggest that shoppers should think carefully before buying and choose reliable sellers"，所以专家建议仔细思考并选择可靠卖家，选第三个。',
      },
    ],
  },
];

export default readingLevels;
