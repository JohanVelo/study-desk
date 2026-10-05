/* Study Desk — SAMPLE DATA (fictional)
   ---------------------------------------------------------------------
   Replace this file with real university data. Nothing else needs to change.

   Shape:  subject → chapter → heading → subheading (any depth works).
   Each node: [title, firstPage, lastPage, difficulty 1-3, children | startingStatus, {calc:1}?]
   Status ladder: 0 Not started · 1 Learning · 2 Understood · 3 Practised · 4 Revised · 5 Mastered
   Exams: use  exam:"2026-11-02"  (real date) or  examInDays:10  (prototype, relative to first launch).
   Topic ids are built from titles, so progress survives reordering. Renaming a title resets that topic.
   The app checks this file on start-up and lists any problems under Settings → Data check.
*/
window.STUDY_DATA = {
  contentVersion: "sample-1",   /* change this whenever the content below changes, so installed apps load it */
  subjects: [
    { id:"psy", name:"Psychology", code:"PSY 210", course:"Research Methods in Psychology", hue:24, examInDays:10, examTime:"09:00", venue:"Exam Hall B",
      chapters:[
        ["Psychology as a science",1,34,1,[
          ["What makes psychology scientific",1,12,1,[["Empiricism",2,6,1,4],["The scientific method",7,12,1,4]]],
          ["Theories and hypotheses",13,34,2,[["From theory to hypothesis",13,22,2,3],["Falsifiability",23,34,2,3]]]]],
        ["Research ethics",35,74,2,[
          ["Ethical principles",35,52,2,[["Informed consent",36,43,1,4],["Deception and debriefing",44,52,2,3]]],
          ["Ethics committees",53,74,2,[["Risk–benefit analysis",53,63,2,3],["Vulnerable participants",64,74,2,2]]]]],
        ["Research methods",75,102,3,[
          ["Research designs",75,82,2,[["Experimental designs",76,78,2,4],["Correlational designs",79,82,2,1]]],
          ["Variables",83,89,3,[["Independent variables",83,84,2,2],["Dependent variables",85,86,2,1],["Confounding variables",87,89,3,0]]],
          ["Sampling methods",90,102,2,[["Probability sampling",90,95,2,2],["Non-probability sampling",96,102,2,1]]]]],
        ["Statistics",103,150,3,[
          ["Descriptive statistics",103,120,2,[["Central tendency",103,110,1,3],["Variability",111,120,2,2,{calc:1}]]],
          ["Inferential statistics",121,150,3,[["Statistical significance",121,132,3,2,{calc:1}],["Degrees of freedom",133,140,3,2,{calc:1}],["t-tests",141,150,3,0,{calc:1}]]]]]
      ]},
    { id:"ant", name:"Anthropology", code:"ANT 120", course:"Introduction to Social Anthropology", hue:55, examInDays:15, examTime:"14:00", venue:"Old Arts 104",
      chapters:[
        ["What is anthropology?",1,34,1,[
          ["The four fields",1,14,1,[["Cultural anthropology",2,7,1,4],["Biological and archaeological anthropology",8,14,1,3]]],
          ["The holistic perspective",15,34,2,[["Holism",15,24,2,2],["Comparison across societies",25,34,2,1]]]]],
        ["Culture",35,68,2,[
          ["Defining culture",35,48,2,[["Culture is learned",36,41,1,2],["Symbols and meaning",42,48,2,1]]],
          ["Cultural relativism",49,58,3,[["Ethnocentrism",49,53,2,1],["Relativism and its limits",54,58,3,1]]],
          ["Enculturation",59,68,2,[["Enculturation in childhood",59,68,2,0]]]]],
        ["Kinship and family",69,104,3,[
          ["Descent",69,86,3,[["Unilineal descent",70,78,3,0],["Bilateral descent",79,86,2,0]]],
          ["Marriage",87,104,2,[["Marriage rules",87,95,2,0],["Bridewealth and dowry",96,104,2,0]]]]],
        ["Fieldwork and ethnography",105,138,2,[
          ["Participant observation",105,120,2,[["Malinowski in the Trobriand Islands",106,112,1,1],["Writing field notes",113,120,2,0]]],
          ["Reflexivity",121,138,3,[["Positionality",121,130,3,0],["Writing ethnography",131,138,2,0]]]]]
      ]},
    { id:"swk", name:"Social Work", code:"SWK 201", course:"Foundations of Social Work Practice", hue:200, examInDays:20, examTime:"09:00", venue:"Sports Centre",
      chapters:[
        ["Values and history",1,40,1,[
          ["Origins of the profession",1,18,1,[["Charity Organisation Societies",2,9,1,4],["The settlement movement",10,18,1,3]]],
          ["Core values",19,40,1,[["Social justice",19,28,1,3],["Dignity and worth of the person",29,40,1,2]]]]],
        ["Ecological systems theory",41,76,2,[
          ["Bronfenbrenner's systems",41,60,2,[["Micro- and mesosystems",42,50,2,2],["Exo-, macro- and chronosystems",51,60,3,1]]],
          ["Person-in-environment",61,76,2,[["Assessing the environment",61,76,2,1]]]]],
        ["Case management",77,118,3,[
          ["Engagement and assessment",77,96,2,[["Building rapport",78,85,1,3],["Strengths-based assessment",86,96,2,1]]],
          ["Planning and intervention",97,118,3,[["Goal setting",97,106,2,0],["Evaluation and termination",107,118,3,0]]]]],
        ["Ethics in practice",119,150,2,[
          ["Confidentiality",119,134,2,[["Limits of confidentiality",120,127,2,1],["Record keeping",128,134,1,0]]],
          ["Ethical dilemmas",135,150,3,[["Decision-making models",135,150,3,0]]]]]
      ]}
  ],

  /* Practice questions: topic = leaf title (matched by name), level: easy | medium | hard | exam */
  questions: [
    {topic:"Independent variables", level:"easy", q:"A study tests whether caffeine improves memory. Participants get 0 mg, 100 mg or 200 mg of caffeine. The amount of caffeine is the…", o:["Independent variable","Dependent variable","Confounding variable","Control variable"], a:0, e:"The researcher sets the caffeine dose, so it is the independent variable. Memory score is what gets measured, which makes it the dependent variable."},
    {topic:"Dependent variables", level:"easy", q:"In the same caffeine study, which of these is the dependent variable?", o:["The caffeine dose","The number of words recalled","The time of day","The participants' age"], a:1, e:"The dependent variable is the outcome you measure to see if the independent variable had an effect: here, words recalled."},
    {topic:"Confounding variables", level:"medium", q:"The 200 mg group is tested at 08:00 and the 0 mg group at 20:00. Time of day is now a…", o:["Dependent variable","Moderator chosen by design","Confounding variable","Random error"], a:2, e:"Time of day changes along with the caffeine dose, so you cannot tell which one caused any difference in memory. That makes it a confound."},
    {topic:"Correlational designs", level:"medium", q:"A study finds r = −.45 between daily screen time and hours of sleep. Which conclusion is justified?", o:["Screen time causes poor sleep","There is a moderate negative association","There is no relationship","Sleep causes screen time"], a:1, e:"r = −.45 shows a moderate negative relationship: more screen time goes with less sleep. A correlational design cannot show which causes which."},
    {topic:"Correlational designs", level:"hard", q:"Why can a correlation between ice-cream sales and drowning not show that ice cream causes drowning?", o:["The sample is too small","A third variable (hot weather) may drive both","Correlations are always weak","Drowning cannot be measured"], a:1, e:"Hot weather increases both ice-cream sales and swimming. This is the third-variable problem, one reason correlation is not causation."},
    {topic:"Statistical significance", level:"hard", q:"A t-test gives p = .03 with α = .05. What does p = .03 mean?", o:["There is a 3% chance the null hypothesis is true","If the null were true, a result this extreme would occur about 3% of the time","There is a 97% chance the effect is real","The effect is large"], a:1, e:"A p-value is the probability of data at least this extreme if the null hypothesis were true. It is not the probability that the null is true, and it says nothing about effect size."},
    {topic:"Statistical significance", level:"exam", q:"Which change would most directly reduce the risk of a Type I error?", o:["Increasing the sample size","Lowering α from .05 to .01","Using a one-tailed test","Measuring more variables"], a:1, e:"α is the Type I error rate you accept. Lowering it to .01 means you reject a true null only 1% of the time (at the cost of more Type II errors)."},
    {topic:"Degrees of freedom", level:"hard", q:"An independent-samples t-test compares groups of 15 and 17 participants. What are the degrees of freedom?", o:["32","31","30","16"], a:2, e:"For an independent-samples t-test, df = n₁ + n₂ − 2 = 15 + 17 − 2 = 30."},
    {topic:"Degrees of freedom", level:"medium", q:"A one-sample t-test uses 25 participants. What are the degrees of freedom?", o:["25","24","23","26"], a:1, e:"For a one-sample t-test, df = n − 1 = 24. One degree of freedom is used up estimating the mean."},
    {topic:"Experimental designs", level:"exam", q:"60 students are randomly assigned to use a mindfulness app or join a waitlist; anxiety is measured after 6 weeks. This is a…", o:["Correlational design","Quasi-experimental design","True experiment (between-subjects)","Case study"], a:2, e:"Random assignment to conditions plus a manipulated independent variable makes this a true experiment. Each student is in only one group, so it is between-subjects."},
    {topic:"Probability sampling", level:"medium", q:"A researcher picks every 10th name on the student register after a random start. This is…", o:["Simple random sampling","Systematic sampling","Quota sampling","Snowball sampling"], a:1, e:"Selecting every k-th person from a list after a random start is systematic sampling, a probability method."},
    {topic:"Enculturation in childhood", level:"easy", q:"The process by which a child learns the culture they are born into is called…", o:["Acculturation","Enculturation","Diffusion","Assimilation"], a:1, e:"Enculturation is learning your own culture. Acculturation is change that happens when two cultures meet."},
    {topic:"Relativism and its limits", level:"medium", q:"Cultural relativism asks anthropologists to…", o:["Accept every practice as morally right","Understand a practice within its own cultural context","Rank cultures from simple to complex","Avoid studying other cultures"], a:1, e:"Relativism is a method for understanding: interpret a practice in its own context before judging it. It does not require you to approve of everything."},
    {topic:"Ethnocentrism", level:"hard", q:"A visitor calls a host community's food 'disgusting' because it differs from home. This is an example of…", o:["Cultural relativism","Ethnocentrism","Enculturation","Holism"], a:1, e:"Judging another culture by the standards of your own is ethnocentrism."},
    {topic:"Malinowski in the Trobriand Islands", level:"exam", q:"Long-term fieldwork where the researcher lives in the community and joins daily life is called…", o:["Survey research","Participant observation","Armchair anthropology","Structured interviewing"], a:1, e:"Participant observation, associated with Malinowski's work in the Trobriand Islands, is the core method of ethnography."},
    {topic:"Micro- and mesosystems", level:"easy", q:"In Bronfenbrenner's model, a child's family and classroom belong to the…", o:["Microsystem","Mesosystem","Exosystem","Macrosystem"], a:0, e:"The microsystem holds settings the child is directly part of, such as family, school and peers."},
    {topic:"Micro- and mesosystems", level:"medium", q:"Communication between a child's parents and teacher is part of the…", o:["Microsystem","Mesosystem","Exosystem","Chronosystem"], a:1, e:"The mesosystem is the links between microsystems, such as home talking to school."},
    {topic:"Goal setting", level:"exam", q:"In the case management process, what normally comes straight after assessment?", o:["Termination","Planning","Engagement","Evaluation"], a:1, e:"The usual order is engagement, assessment, planning, intervention, evaluation and termination. Plans are built from what the assessment found."},
    {topic:"Limits of confidentiality", level:"hard", q:"A client discloses a specific plan to seriously harm a named person. The social worker should…", o:["Keep it confidential in all cases","Follow the duty-to-warn / protect procedure","End the relationship immediately","Ignore it unless repeated"], a:1, e:"Confidentiality has limits. A serious, specific threat to an identifiable person triggers the agency's duty-to-protect procedure."}
  ],

  /* Starting practice history and mistakes (so weak areas show something) */
  history: {
    "Degrees of freedom":{a:10,c:4}, "Statistical significance":{a:9,c:4}, "Correlational designs":{a:8,c:3},
    "Probability sampling":{a:9,c:5}, "Relativism and its limits":{a:7,c:3}, "Micro- and mesosystems":{a:5,c:3},
    "Experimental designs":{a:12,c:11}, "Independent variables":{a:6,c:5}, "Central tendency":{a:8,c:7}
  },
  mistakes: { "Statistical significance":3, "Relativism and its limits":2, "Degrees of freedom":2, "Micro- and mesosystems":1 },

  /* "I don't understand this" explanations, keyed by leaf title. Others fall back to a template. */
  explain: {
    "Statistical significance": {
      simple:"Imagine flipping a coin 10 times and getting 9 heads. You start to wonder if the coin is unfair. Statistical significance is a rule for deciding when a result is surprising enough that 'just luck' stops being a good explanation.",
      uni:"We assume a null hypothesis (no effect) and calculate p: the probability of getting data at least as extreme as ours if the null were true. If p falls below a cut-off chosen in advance (α, usually .05), we reject the null and call the result statistically significant.",
      exam:"Define p correctly: P(data this extreme | H₀ true). Say what α is (the accepted Type I error rate). Never write 'the probability the null is true'. Add that significance does not tell you the size or importance of an effect.",
      example:"A mindfulness group scores 4 points lower on anxiety than controls, t(58) = 2.31, p = .024. Because .024 < .05, the difference is significant at α = .05. We still need an effect size (for example Cohen's d) to say how big it is."},
    "Degrees of freedom": {
      simple:"If five friends must average 10 sweets each and four have already taken theirs, the last person has no choice left. Degrees of freedom count how many values are still free to vary.",
      uni:"df is the number of independent pieces of information left after estimating parameters. Each estimated mean uses one up, so a one-sample t-test has n − 1 and an independent t-test has n₁ + n₂ − 2.",
      exam:"Show the formula, then the numbers: df = 15 + 17 − 2 = 30. Report it in brackets: t(30) = 2.10, p = .044. Markers often give a mark just for the correct df.",
      example:"Groups of 12 and 14: df = 12 + 14 − 2 = 24. With df = 24 the two-tailed critical t at α = .05 is about 2.06."},
    "Relativism and its limits": {
      simple:"Before deciding whether something another group does is strange or wrong, first try to see it the way they see it.",
      uni:"Cultural relativism is a methodological stance: practices are interpreted within the meanings, values and history of the culture that produces them. Critics note that strong relativism can make it hard to criticise human-rights abuses.",
      exam:"Separate methodological relativism (a research tool) from moral relativism (a claim that nothing can be judged). Give one example and one limitation for top marks.",
      example:"An outsider may see bridewealth as 'buying a wife'. Read in context, it often creates obligations between two families and recognises the bride's value to her own kin."},
    "Confounding variables": {
      simple:"A confound is a hidden extra difference between your groups that could explain the result instead of the thing you are testing.",
      uni:"A confounding variable co-varies with the independent variable and also affects the dependent variable, threatening internal validity. Random assignment, matching and holding conditions constant are the main controls.",
      exam:"Name the confound, explain how it varies with the IV, explain how it could affect the DV, and suggest a specific control. That four-step answer fits most 6-mark questions.",
      example:"Coffee drinkers are tested in the morning and non-drinkers at night. Better memory in the coffee group might be due to time of day, not caffeine."},
    "Micro- and mesosystems": {
      simple:"Think of circles around a child. The closest circle is the people they see every day. The next idea is how those people connect with each other.",
      uni:"In Bronfenbrenner's ecological model the microsystem holds direct settings (family, school, peers). The mesosystem is the interactions between those settings, such as parent–teacher communication.",
      exam:"Define each system and give a short case example. Show how a problem in one microsystem can spill into another through the mesosystem.",
      example:"A child's attendance drops. Home and school have no contact (weak mesosystem), so nobody connects the absences to a parent's new night shift."}
  }
};
