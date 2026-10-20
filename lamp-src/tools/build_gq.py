import json
S = []
def s(id, title, ref, desc): S.append({"id": id, "title": title, "ref": ref, "desc": desc, "qs": []})
def q(text, o, why, r): S[-1]["qs"].append({"q": text, "o": o, "why": why, "r": r})

# 1 SOM
s("som", "Sermon on the Mount", "Matthew 5–7", "Jesus' great teaching on life in the kingdom of heaven.")
q("When Jesus went up the mountain and sat down, who came to Him to be taught?",
  ["His disciples", "The scribes and Pharisees", "John the Baptist's followers", "The crowds from Jerusalem only"],
  "Seeing the crowds, Jesus went up the mountain and sat down (the posture of a teacher), and His disciples came to Him. The crowds were listening too, as 7:28 shows.", "MAT.5.1")
q("What did Jesus say He had come to do with the Law and the Prophets?",
  ["Fulfill them", "Abolish them", "Replace them with a new law", "Simplify them into two rules"],
  "“Do not think that I have come to abolish the Law or the Prophets. I have not come to abolish them, but to fulfill them.”", "MAT.5.17")
q("Whose righteousness did Jesus say His hearers must surpass to enter the kingdom?",
  ["The scribes and Pharisees", "The Roman centurions", "The tax collectors", "Abraham and the patriarchs"],
  "The scribes and Pharisees were seen as the most careful law-keepers, which made the statement shocking. Jesus goes on to show that God looks at the heart, not just outward acts.", "MAT.5.20")
q("If you remember at the altar that your brother has something against you, what should you do?",
  ["Leave your gift and first be reconciled", "Offer a larger gift as atonement", "Finish the offering, then pray for him", "Ask the priest to judge between you"],
  "Jesus puts reconciliation ahead of worship: leave the gift before the altar, go and be reconciled, then come and offer it.", "MAT.5.23")
q("“If someone forces you to go one mile, go with him two.” What custom lies behind this?",
  ["Soldiers could compel civilians to carry loads", "Pilgrims were escorted to the temple", "Debtors had to walk to court with creditors", "Shepherds swapped watches every mile"],
  "Roman soldiers had the right to press local people into carrying their gear a set distance. Jesus tells His hearers to go beyond what is demanded, even for an occupying army.", "MAT.5.41")
q("What reason does Jesus give for loving your enemies?",
  ["God sends sun and rain on both evil and good", "Enemies will become friends in the end", "It will heap shame on their heads", "The Law of Moses commands it word for word"],
  "Love your enemies “that you may be sons of your Father in heaven. He causes His sun to rise on the evil and the good, and sends rain on the righteous and the unrighteous.”", "MAT.5.45")
q("What do the hypocrites do when they give to the needy, according to Jesus?",
  ["Sound a trumpet to be honoured by men", "Give only to their own relatives", "Give with coins from the temple", "Make the poor wait outside the gate"],
  "They announce it in the synagogues and streets to be honoured by men, so “they already have their full reward.” Jesus says give in secret instead.", "MAT.6.2")
q("Right after the Lord's Prayer, which line of it does Jesus explain further?",
  ["Forgiving others their trespasses", "Giving us our daily bread", "Your kingdom come", "Lead us not into temptation"],
  "Immediately after the prayer Jesus adds: if you forgive men their trespasses, your heavenly Father will also forgive you; but if you do not, neither will He.", "MAT.6.14")
q("To whose splendour does Jesus compare the lilies of the field?",
  ["Solomon in all his glory", "The high priest's robes", "Herod's palace", "Caesar's purple"],
  "Not even Solomon, the richest king of Israel, was dressed like one of these. If God clothes the grass so well, He will surely clothe His people.", "MAT.6.29")
q("Jesus says that doing to others what you want them to do to you sums up what?",
  ["The Law and the Prophets", "The Ten Commandments only", "The wisdom of Solomon", "The teaching of the elders"],
  "“In everything, then, do to others as you would have them do to you. For this is the essence of the Law and the Prophets.”", "MAT.7.12")
q("In the parable of the two builders, what made the wise man wise?",
  ["He heard Jesus' words and acted on them", "He understood Jesus' words fully", "He built higher than the floods", "He built faster than the foolish man"],
  "Both men heard the words; only the one who put them into practice built on the rock. Hearing without doing is building on sand.", "MAT.7.24")
q("Why were the crowds astonished at the end of the sermon?",
  ["He taught as one with authority, unlike their scribes", "He healed many during the teaching", "He quoted every prophet by name", "He spoke in Greek rather than Aramaic"],
  "The scribes taught by citing earlier authorities; Jesus said “But I tell you” and taught with His own authority.", "MAT.7.28")

# 2 Mark
s("mark", "Gospel of Mark", "Mark 1–16", "The fast-moving account of Jesus, the servant Son of God.")
q("Mark opens by quoting “Isaiah the prophet”, but the line “I will send My messenger ahead of You” comes from which prophet?",
  ["Malachi", "Jeremiah", "Ezekiel", "Daniel"],
  "Mark combines Malachi 3:1 (the messenger) with Isaiah 40:3 (a voice in the wilderness) under Isaiah's name. Both point to John the Baptist.", "MRK.1.2")
q("How did the four men get the paralysed man to Jesus in Capernaum?",
  ["They dug through the roof and lowered him", "They carried him in through a window", "They waited until the crowd went home", "They met Jesus on the road outside town"],
  "The crowd blocked the door, so they uncovered the roof above Jesus and lowered the mat. Jesus saw their faith and first forgave the man's sins.", "MRK.2.4")
q("Why did Jesus' family set out to take custody of Him?",
  ["They said, “He is out of His mind”", "They feared Herod would arrest Him", "They wanted Him back in the carpenter's shop", "The Pharisees had ordered them to"],
  "So many people pressed in that He couldn't even eat, and His family went to seize Him. Mark then sets this alongside the scribes' charge that He was possessed.", "MRK.3.21")
q("Where was Jesus during the storm on the Sea of Galilee?",
  ["Asleep on a cushion in the stern", "Praying alone on the mountain", "Walking toward them on the water", "Steering the boat with Peter"],
  "He was asleep on a cushion in the stern. The disciples woke Him: “Teacher, don't You care that we are perishing?”", "MRK.4.38")
q("After Jesus freed the demon-possessed man in the region of the Gerasenes, what did the locals do?",
  ["Begged Jesus to leave their region", "Brought all their sick to Him", "Built a shrine where it happened", "Asked Him to stay and teach"],
  "Seeing the man clothed and in his right mind, and hearing about the pigs, they were afraid and begged Jesus to leave. The healed man was sent home to tell what God had done.", "MRK.5.17")
q("On the way to heal Jairus's daughter, who interrupted Jesus?",
  ["A woman who had bled for twelve years", "A blind beggar by the roadside", "A centurion with a sick servant", "A leper who knelt before Him"],
  "Mark sandwiches the stories: the woman suffered twelve years, and Jairus's daughter was twelve years old. The delay meant news came that the girl had died.", "MRK.5.25")
q("Why had Herod imprisoned John the Baptist?",
  ["John condemned his marriage to Herodias", "John refused to pay the temple tax", "John led a revolt in the wilderness", "John called Herod a fox in public"],
  "Herodias had been the wife of Herod's brother Philip, and John kept saying it was not lawful. Herodias held a grudge and later got John's head.", "MRK.6.17")
q("In Mark 7, what does “Corban” mean?",
  ["A gift devoted to God", "A ritual hand-washing", "A tithe of herbs", "A vow of silence"],
  "Jesus criticises a tradition that let people declare money “Corban” (devoted to God) and so avoid supporting their parents, nullifying the command to honour them.", "MRK.7.11")
q("What prompted Jesus to say to Peter, “Get behind Me, Satan!”?",
  ["Peter rebuked Him for predicting His death", "Peter denied knowing Him", "Peter cut off a servant's ear", "Peter wanted to build three shelters"],
  "Just after confessing Jesus as the Christ, Peter took Him aside to rebuke Him for speaking of suffering, rejection and death. Peter had in mind the things of men, not of God.", "MRK.8.32")
q("At Jesus' arrest, what happened to the young man wearing only a linen cloth?",
  ["He fled naked, leaving the cloth behind", "He was arrested in Jesus' place", "He ran to warn the other disciples", "He followed Jesus into the high priest's house"],
  "Only Mark records this: the guards seized him, but he left the cloth and ran. It shows how completely everyone deserted Jesus.", "MRK.14.51")
q("Who was forced to carry Jesus' cross, and how does Mark identify him?",
  ["Simon of Cyrene, father of Alexander and Rufus", "Simon Peter, the fisherman", "Joseph of Arimathea, a council member", "Simon the Zealot, one of the Twelve"],
  "He was coming in from the country. Mark names his sons, which suggests they were known to Mark's readers.", "MRK.15.21")
q("The young man at the empty tomb told the women to take the news to the disciples and to whom by name?",
  ["Peter", "John", "Thomas", "James"],
  "“But go, tell His disciples and Peter, ‘He is going ahead of you into Galilee.’” Peter, who had denied Him, was singled out.", "MRK.16.7")

# 3 Genesis
s("gen", "Genesis", "Genesis 1–50", "Beginnings: creation, the fall, and God's promises to Abraham's family.")
q("What work did God give the man when He placed him in the garden of Eden?",
  ["To cultivate and keep it", "To name the stars", "To build a city", "To guard the tree of life"],
  "Work came before the fall: the LORD God took the man and put him in Eden to cultivate and keep it.", "GEN.2.15")
q("Who asked “Am I my brother's keeper?”, and to whom?",
  ["Cain, answering the LORD", "Esau, answering Jacob", "Joseph's brothers, answering Jacob", "Lot, answering Abraham"],
  "After killing Abel, Cain answered the LORD's question “Where is your brother Abel?” with a lie and this defiant question.", "GEN.4.9")
q("Why did the people at Babel build their city and tower?",
  ["To make a name for themselves and not be scattered", "To escape another flood", "To worship the sun god", "To protect themselves from Nimrod"],
  "“Let us make a name for ourselves, that we may not be scattered over the face of all the earth.” In the next chapter God promises to make Abram's name great instead.", "GEN.11.4")
q("After Abram rescued Lot, what did he give Melchizedek, king of Salem?",
  ["A tenth of everything", "Lot's freedom", "His sword and shield", "The king of Sodom's crown"],
  "Melchizedek, priest of God Most High, brought bread and wine and blessed Abram, and Abram gave him a tenth of everything. Hebrews 7 builds on this.", "GEN.14.18")
q("In Genesis 15, what did Abram believe that was credited to him as righteousness?",
  ["God's promise of offspring like the stars", "God's promise of the land of Egypt", "That Isaac would be spared", "That Sodom would be saved"],
  "God took Abram outside: “Count the stars… So shall your offspring be.” Abram believed the LORD. Paul quotes this in Romans 4.", "GEN.15.5")
q("Who called the LORD “the God who sees me”?",
  ["Hagar, who had fled from Sarai", "Rebekah, at the well", "Leah, when Reuben was born", "Rachel, in her barrenness"],
  "The angel of the LORD found the pregnant Hagar by a spring in the wilderness. She gave this name to the LORD who spoke to her.", "GEN.16.13")
q("Isaac's name echoes what reaction to God's promise of a son?",
  ["Laughter", "Weeping", "Silence", "Fear"],
  "Abraham and Sarah both laughed at the promise. When Isaac was born Sarah said, “God has made me laugh.” Isaac means “he laughs.”", "GEN.21.6")
q("Where was Abraham told to go to offer Isaac?",
  ["A mountain in the land of Moriah", "Mount Sinai in the wilderness", "The oaks of Mamre", "The altar at Bethel"],
  "“Go to the land of Moriah and offer him there as a burnt offering on one of the mountains.” 2 Chronicles 3:1 places Solomon's temple on Mount Moriah.", "GEN.22.2")
q("Why was Esau also called Edom?",
  ["From the red stew he traded his birthright for", "From the red hair he was born with only", "From the land of Edom he conquered", "From his father's blessing on him"],
  "Famished, Esau said, “Let me eat some of that red stew” — that is why he was called Edom (“red”). His descendants became the Edomites.", "GEN.25.30")
q("Why was Jacob given the name Israel?",
  ["He had struggled with God and men and prevailed", "He had dreamed of a stairway to heaven", "He had become father of twelve sons", "He had reconciled with Esau"],
  "After wrestling through the night at the Jabbok, Jacob would not let go without a blessing, and was renamed Israel.", "GEN.32.28")
q("Which brother suggested selling Joseph rather than killing him?",
  ["Judah", "Reuben", "Benjamin", "Simeon"],
  "Reuben had already talked them out of killing Joseph, planning to rescue him. Judah then proposed selling him to the Ishmaelites: “What profit will we gain if we kill our brother?”", "GEN.37.26")
q("When did Joseph say, “What you intended against me for evil, God intended for good”?",
  ["After Jacob died and his brothers feared revenge", "When he first revealed himself in Egypt", "When the cup was found in Benjamin's sack", "When Pharaoh made him second in command"],
  "After their father's death the brothers feared Joseph would now pay them back. He wept and reassured them of God's purpose: to preserve the lives of many people.", "GEN.50.15")

# 4 Exodus
s("exo", "Exodus 1–20", "Exodus 1–20", "From slavery in Egypt to the covenant at Mount Sinai.")
q("Why did the Hebrew midwives disobey Pharaoh's order to kill the baby boys?",
  ["They feared God", "They were bribed by the Hebrews", "Moses' mother begged them", "Pharaoh's daughter protected them"],
  "Shiphrah and Puah feared God and let the boys live. God was good to them and gave them families of their own.", "EXO.1.17")
q("Who gave Moses his name, and why?",
  ["Pharaoh's daughter, because she drew him out of the water", "His mother, because he was hidden", "Miriam, because he was found by the river", "Jethro, because he was a stranger"],
  "When the child grew older he was brought to Pharaoh's daughter, who named him Moses, explaining, “I drew him out of the water.”", "EXO.2.10")
q("Whose flock was Moses tending when he saw the burning bush?",
  ["Jethro's, his father-in-law", "Pharaoh's royal flocks", "His brother Aaron's", "His own, bought in Midian"],
  "Moses, once a prince of Egypt, was now shepherding the flock of Jethro, the priest of Midian, when he came to Horeb, the mountain of God.", "EXO.3.1")
q("God's words “I AM WHO I AM” answered which question from Moses?",
  ["What name to give if Israel asked who sent him", "Why God had let Israel suffer", "How Pharaoh would ever listen", "Where Israel was going to live"],
  "Moses asked what to say if the Israelites asked, “What is His name?” God revealed Himself as I AM, the God of their fathers.", "EXO.3.13")
q("How did Pharaoh first respond to Moses' request to let Israel go and worship?",
  ["Stopped supplying straw but kept the brick quota", "Doubled the soldiers guarding them", "Ordered all Israelite boys killed", "Sent Moses back to Midian"],
  "Pharaoh accused the Israelites of laziness and made them gather their own straw for the same number of bricks, turning the people against Moses.", "EXO.5.7")
q("At which plague did Pharaoh's magicians admit, “This is the finger of God”?",
  ["Gnats", "Frogs", "Blood", "Boils"],
  "The magicians had copied the blood and frogs, but could not produce gnats from the dust. Even so, Pharaoh's heart stayed hard.", "EXO.8.18")
q("Why did God not lead Israel along the short coastal road through Philistine country?",
  ["They might face war and return to Egypt", "The Red Sea route was a faster road", "The Philistines had blocked it", "Moses had vowed to go to Sinai first"],
  "“If the people face war, they might change their minds and return to Egypt.” So God led them the roundabout way toward the Red Sea.", "EXO.13.17")
q("Whose bones did Moses take with him out of Egypt?",
  ["Joseph's", "Jacob's", "Abraham's", "Levi's"],
  "Joseph had made the Israelites swear they would carry his bones up from Egypt (Genesis 50:25). He was finally buried at Shechem (Joshua 24:32).", "EXO.13.19")
q("Why were the Israelites to gather twice as much manna on the sixth day?",
  ["None would fall on the Sabbath", "It would spoil after one day", "Moses needed extra for the priests", "A feast was held on the sixth day"],
  "Manna kept overnight normally bred worms, but the sixth day's extra portion lasted through the Sabbath, a day of rest to the LORD.", "EXO.16.22")
q("In the battle against Amalek at Rephidim, what decided who was winning?",
  ["Whether Moses' hands were raised", "Whether the ark went before them", "How loudly the trumpets sounded", "Whether Joshua kept his sword drawn"],
  "When Moses held up his hands Israel prevailed; when he lowered them Amalek prevailed. Aaron and Hur held up his hands until sunset.", "EXO.17.11")
q("What advice did Jethro give Moses at the mountain of God?",
  ["Appoint capable men to judge smaller cases", "Return to Egypt and free the rest", "Build a tabernacle for the ark", "Choose a king to lead in war"],
  "Seeing Moses judging the people from morning to evening, Jethro said it was not good: he would wear himself out. He should teach the law and delegate.", "EXO.18.17")
q("How does God introduce Himself before giving the Ten Commandments?",
  ["As the one who brought them out of Egypt", "As the Creator of heaven and earth", "As the God of Melchizedek", "As the judge of all the nations"],
  "“I am the LORD your God, who brought you out of the land of Egypt, out of the house of slavery.” The law is given to people already rescued.", "EXO.20.2")

# 5 Luke
s("luke", "Luke", "Luke 1–24", "An orderly account of Jesus, the Saviour of the lost.")
q("To whom does Luke address his Gospel, and why?",
  ["Theophilus, so he may know the certainty of what he was taught", "The church at Antioch, to settle a dispute", "Paul, to help him in Rome", "Gentile widows, to comfort them"],
  "Luke says he carefully investigated everything from the beginning and wrote an orderly account for “most excellent Theophilus.”", "LUK.1.3")
q("Why was Zechariah unable to speak until John was born?",
  ["He did not believe Gabriel's message", "He saw the face of God in the temple", "He had taken a Nazirite vow", "He was struck by fear of the incense"],
  "Gabriel said Zechariah would be silent “because you did not believe my words, which will be fulfilled at their proper time.”", "LUK.1.20")
q("Why did Joseph go to Bethlehem with Mary?",
  ["To register there as a descendant of David", "To escape from Herod's soldiers", "To present Jesus at the temple", "To find work as a builder"],
  "Caesar Augustus ordered a census, and each went to his own town. Joseph belonged to the house and line of David, so he went to the city of David.", "LUK.2.4")
q("Where did Mary and Joseph find twelve-year-old Jesus after three days?",
  ["In the temple courts among the teachers", "In the house of Zechariah and Elizabeth", "With travellers on the road to Nazareth", "On the Mount of Olives praying"],
  "He was sitting among the teachers, listening and asking questions. “Didn't you know I had to be in My Father's house?”", "LUK.2.46")
q("In the Nazareth synagogue, which scroll was Jesus handed to read?",
  ["Isaiah", "Deuteronomy", "Psalms", "Jeremiah"],
  "He found the place, “The Spirit of the Lord is on Me” (Isaiah 61), and said, “Today this Scripture is fulfilled in your hearing.”", "LUK.4.17")
q("Which two Old Testament examples did Jesus cite that enraged the Nazareth synagogue?",
  ["The widow of Zarephath and Naaman the Syrian", "Jonah in Nineveh and Rahab of Jericho", "Ruth the Moabite and the queen of Sheba", "Daniel in Babylon and Esther in Persia"],
  "Both were foreigners blessed by God through Elijah and Elisha while Israel was passed over. The crowd tried to throw Jesus off a cliff.", "LUK.4.25")
q("In whose house did a sinful woman anoint Jesus' feet in Luke 7?",
  ["Simon, a Pharisee", "Simon the leper in Bethany", "Zacchaeus in Jericho", "Martha in Bethany"],
  "Simon the Pharisee thought a real prophet would know what kind of woman she was. Jesus answered with the parable of two debtors.", "LUK.7.36")
q("What question led Jesus to tell the parable of the Good Samaritan?",
  ["“And who is my neighbor?”", "“How many times shall I forgive?”", "“Who is the greatest in the kingdom?”", "“Why do you eat with sinners?”"],
  "An expert in the law, wanting to justify himself, asked this. Jesus' story made a despised Samaritan the hero.", "LUK.10.29")
q("What prompted the parables of the lost sheep, lost coin and lost son?",
  ["Pharisees grumbled that Jesus ate with sinners", "The disciples argued about rank", "A rich ruler asked about eternal life", "Herod sought to kill Jesus"],
  "Tax collectors and sinners were gathering to hear Him, and the Pharisees and scribes muttered. The elder brother in the third parable mirrors the grumblers.", "LUK.15.1")
q("What did Zacchaeus promise when Jesus came to his house?",
  ["Half his goods to the poor and fourfold repayment", "To leave his job and follow Jesus", "To build a synagogue in Jericho", "To pay the temple tax for all"],
  "The crowd grumbled that Jesus was a sinner's guest. Zacchaeus stood up and promised generous restitution; Jesus said salvation had come to his house.", "LUK.19.8")
q("What did Pilate do when he learned Jesus was a Galilean?",
  ["Sent Him to Herod, who was in Jerusalem", "Released Him to the crowd", "Sent Him to Caiaphas", "Had Him flogged at once"],
  "Galilee was Herod's jurisdiction. Only Luke records that Herod and Pilate became friends that day.", "LUK.23.7")
q("At Emmaus, when did the two disciples recognise the risen Jesus?",
  ["When He broke the bread", "When He showed His hands", "When He called them by name", "When He explained the Scriptures"],
  "He had explained the Scriptures on the road, yet only when He took bread, blessed it and broke it were their eyes opened, and He vanished.", "LUK.24.30")

# 6 Acts
s("acts", "Acts", "Acts 1–28", "The gospel spreads from Jerusalem to Rome by the power of the Spirit.")
q("How was Judas's replacement among the apostles chosen?",
  ["They prayed and cast lots; it fell to Matthias", "Peter appointed Barsabbas", "The church voted for Matthias", "Jesus named him before ascending"],
  "The candidate had to have been with them from John's baptism to the ascension. They prayed and drew lots between Joseph Barsabbas and Matthias.", "ACT.1.23")
q("At Pentecost, which prophet did Peter quote to explain what was happening?",
  ["Joel", "Isaiah", "Amos", "Zechariah"],
  "Some mocked that they were drunk. Peter said it was only nine in the morning: this is what was spoken by Joel, “I will pour out My Spirit on all people.”", "ACT.2.16")
q("What was the sin of Ananias and Sapphira?",
  ["Lying about keeping back part of the price", "Refusing to sell their land at all", "Stealing from the church's common fund", "Selling land that wasn't theirs"],
  "Peter said the land and money were theirs to keep. Their sin was pretending to give all while holding some back — lying to the Holy Spirit.", "ACT.5.3")
q("Why were the seven (including Stephen) chosen in Acts 6?",
  ["Greek-speaking widows were overlooked in the food", "The apostles were in prison", "The temple guards needed replacing", "Gentiles needed teachers"],
  "The Hellenistic Jews complained their widows were being neglected in the daily distribution. The apostles devoted themselves to prayer and the word.", "ACT.6.1")
q("At Stephen's stoning, at whose feet did the witnesses lay their garments?",
  ["A young man named Saul", "Caiaphas the high priest", "Gamaliel the teacher", "Barnabas the Levite"],
  "This is Saul's first appearance. He approved of Stephen's death and went on to ravage the church.", "ACT.7.58")
q("What was the Ethiopian official reading when Philip met him?",
  ["Isaiah's “sheep led to the slaughter”", "Moses' blessing on the tribes", "Daniel's vision of the Son of Man", "David's Psalm 23"],
  "He was reading Isaiah 53 aloud in his chariot. Starting from that Scripture, Philip told him the good news about Jesus.", "ACT.8.32")
q("Where was Peter staying when he saw the vision of the sheet with unclean animals?",
  ["With Simon the tanner in Joppa", "With Cornelius in Caesarea", "With John Mark's mother in Jerusalem", "With Lydia in Philippi"],
  "Peter had stayed for several days in Joppa with Simon the tanner (9:43). While he prayed on the roof there, Cornelius's messengers were already on their way.", "ACT.10.6")
q("Where were the disciples first called Christians?",
  ["Antioch", "Jerusalem", "Rome", "Damascus"],
  "Barnabas brought Saul to Antioch, where they taught a large number for a whole year. There the disciples were first called Christians.", "ACT.11.26")
q("What question did the Jerusalem council of Acts 15 settle?",
  ["Whether Gentile believers must be circumcised", "Who should lead the church after James", "Whether to go on mission to Spain", "Whether to keep worshipping in the temple"],
  "Men from Judea taught that Gentiles could not be saved unless circumcised. The council decided not to trouble Gentiles who were turning to God.", "ACT.15.1")
q("Why were Paul and Silas thrown into prison in Philippi?",
  ["Owners of a fortune-telling slave girl lost income", "They preached in the synagogue on the Sabbath", "They refused to bow to Caesar's statue", "The Jews of Thessalonica accused them"],
  "Paul cast a spirit out of the girl, and her owners, seeing their profit gone, dragged them before the magistrates.", "ACT.16.19")
q("What starting point did Paul use when speaking in Athens?",
  ["An altar “TO AN UNKNOWN GOD”", "A statue of Zeus on the Acropolis", "The writings of Moses", "A recent earthquake in the city"],
  "In the Areopagus Paul said, “What you worship as something unknown, I now proclaim to you,” and even quoted their own poets.", "ACT.17.23")
q("On which island did Paul's ship run aground on the way to Rome?",
  ["Malta", "Crete", "Cyprus", "Sicily"],
  "Everyone reached land safely, as Paul had foretold. On Malta Paul survived a viper bite and healed the father of Publius.", "ACT.28.1")

# 7 John
s("john", "John", "John 1–21", "Signs and words showing that Jesus is the Christ, the Son of God.")
q("Who brought Simon Peter to Jesus?",
  ["His brother Andrew", "John the Baptist", "Philip of Bethsaida", "Nathanael"],
  "Andrew had heard John the Baptist call Jesus the Lamb of God. He first found Simon: “We have found the Messiah.”", "JHN.1.40")
q("At the wedding in Cana, what were the stone water jars normally used for?",
  ["Jewish rites of purification", "Storing wine for the feast", "Washing the guests' clothes", "Watering the animals"],
  "Jesus' first sign transformed water meant for ceremonial washing into the best wine.", "JHN.2.6")
q("Why was the Samaritan woman surprised that Jesus asked her for a drink?",
  ["Jews did not associate with Samaritans", "Rabbis never drank from wells", "She had no bucket", "It was the Sabbath"],
  "Jews and Samaritans had centuries of hostility. Jesus was crossing both ethnic and social barriers by speaking to her.", "JHN.4.9")
q("What debate about worship did the Samaritan woman raise with Jesus?",
  ["Whether to worship on this mountain or in Jerusalem", "Whether to offer sacrifices or prayers", "Whether women could enter the temple", "Whether the Sabbath was Saturday"],
  "Samaritans worshipped on Mount Gerizim. Jesus said a time was coming when true worshippers would worship in Spirit and in truth.", "JHN.4.20")
q("After Jesus healed the man at the pool of Bethesda, why were the Jewish leaders upset?",
  ["He was carrying his mat on the Sabbath", "He had gone into the pool before others", "He was a Samaritan", "He refused to go to the priest"],
  "The man had been ill thirty-eight years. The leaders focused on the Sabbath rule rather than the healing, and began to persecute Jesus.", "JHN.5.10")
q("After feeding the five thousand, why did Jesus withdraw to the mountain alone?",
  ["They intended to make Him king by force", "He was mourning John the Baptist", "He was hiding from Herod's soldiers", "He was tired from walking on water"],
  "The people saw the sign and said, “This is truly the Prophet,” but wanted a political king. Jesus withdrew.", "JHN.6.15")
q("Where did Jesus send the man born blind to wash?",
  ["The Pool of Siloam", "The Jordan River", "The Pool of Bethesda", "The brook Kidron"],
  "John notes that Siloam means “Sent” — fitting, since Jesus is the one sent by the Father.", "JHN.9.7")
q("When Jesus heard Lazarus was sick, what did He do?",
  ["Stayed where He was two more days", "Left for Bethany immediately", "Healed him from a distance", "Sent Peter and John ahead"],
  "John stresses that Jesus loved Martha, Mary and Lazarus — yet He waited. By the time He arrived Lazarus had been in the tomb four days.", "JHN.11.6")
q("After Lazarus was raised, who said it was better that one man die for the people?",
  ["Caiaphas, the high priest that year", "Pontius Pilate", "Annas, the former high priest", "Nicodemus"],
  "Caiaphas meant it politically, to avoid Roman reprisals, but John says he unknowingly prophesied that Jesus would die for the nation.", "JHN.11.49")
q("Whose ear did Peter cut off in the garden?",
  ["Malchus, the high priest's servant", "A Roman soldier's", "Judas Iscariot's", "Annas's son's"],
  "Only John names both Peter and Malchus. Jesus told Peter to put his sword away: “Shall I not drink the cup the Father has given Me?”", "JHN.18.10")
q("From the cross, to whom did Jesus entrust His mother?",
  ["The disciple whom He loved", "His brother James", "Mary Magdalene", "Joseph of Arimathea"],
  "“Woman, here is your son” … “Here is your mother.” From that hour this disciple took her into his home.", "JHN.19.26")
q("When the disciples landed by the Sea of Tiberias, what did they find that recalled the night of Peter's denials?",
  ["A charcoal fire", "A rooster crowing", "A servant girl at a gate", "An empty boat"],
  "Peter had denied Jesus while warming himself at a charcoal fire (18:18). Beside another charcoal fire Jesus asked him three times, “Do you love Me?” and told him, “Feed My sheep.”", "JHN.21.9")

# 8 Romans
s("rom", "Romans", "Romans 1–16", "Paul's great letter on the gospel of God's righteousness by faith.")
q("Paul says the gospel is God's power for salvation to everyone who believes, “first to” whom?",
  ["The Jew, then to the Greek", "The apostles, then the church", "The poor, then the rich", "Rome, then to the world"],
  "Paul affirms God's priority for Israel while insisting the gospel is for all who believe, Jew and Gentile alike.", "ROM.1.16")
q("Where did Paul plan to go after visiting the Christians in Rome?",
  ["Spain", "Jerusalem, then home to Tarsus", "Egypt", "Back to Antioch"],
  "Paul hoped to visit them on his way to Spain and be helped on his journey, after first taking a gift to the poor in Jerusalem.", "ROM.15.24")
q("Besides Abraham, which Old Testament figure does Paul quote in Romans 4 on the blessing of forgiveness?",
  ["David", "Moses", "Noah", "Elijah"],
  "Paul quotes Psalm 32: “Blessed are they whose lawless acts are forgiven.”", "ROM.4.6")
q("In Romans 4, why does it matter when Abraham's faith was credited as righteousness?",
  ["It was before he was circumcised", "It was after he offered Isaac", "It was after the Law was given", "It was when he left Ur"],
  "Righteousness came before circumcision, so Abraham is the father of all who believe, including uncircumcised Gentiles.", "ROM.4.10")
q("In Romans 5, whom does Paul set in contrast with Christ?",
  ["Adam", "Moses", "Abraham", "Cain"],
  "Sin and death entered through one man; grace and life come through the one man Jesus Christ. Adam was “a pattern of the One to come.”", "ROM.5.14")
q("What objection does Paul answer at the start of Romans 6?",
  ["Shall we keep sinning so grace may increase?", "Has God rejected His people?", "Is the law itself sinful?", "Why does God still find fault?"],
  "Paul had just said that where sin increased, grace increased all the more. He answers: certainly not — we died to sin.", "ROM.6.1")
q("Which commandment does Paul use to show how the law reveals sin?",
  ["“Do not covet”", "“Do not murder”", "“Remember the Sabbath”", "“Honour your father and mother”"],
  "“I would not have been aware of coveting if the law had not said, ‘Do not covet.’” The law is holy, but sin used it.", "ROM.7.7")
q("What does the Spirit of adoption enable believers to cry out?",
  ["“Abba! Father!”", "“Hosanna!”", "“Maranatha!”", "“Holy, holy, holy!”"],
  "Abba is the Aramaic word for father. Believers are not slaves who fear but children and heirs.", "ROM.8.15")
q("In Romans 9, for whom does Paul say he could wish himself cursed and cut off from Christ?",
  ["His fellow Israelites", "The Gentile believers in Rome", "The false teachers in Galatia", "His fellow apostles"],
  "Paul has great sorrow and unceasing anguish for his kinsmen, to whom belong the adoption, the covenants, the law and the patriarchs.", "ROM.9.3")
q("In Paul's olive tree picture, what are the Gentile believers?",
  ["Wild olive shoots grafted in", "The root that supports the tree", "Natural branches broken off", "Fruit that has fallen to the ground"],
  "Gentiles share in the nourishing root. Paul warns them not to boast, since they are supported by the root, not the reverse.", "ROM.11.17")
q("“If your enemy is hungry, feed him… you will heap burning coals on his head” — which book is Paul quoting?",
  ["Proverbs", "Leviticus", "Isaiah", "Psalms"],
  "Paul quotes Proverbs 25:21–22, then sums up: do not be overcome by evil, but overcome evil with good.", "ROM.12.20")
q("Whom does Paul commend at the beginning of Romans 16?",
  ["Phoebe, a servant of the church in Cenchrea", "Lydia, a seller of purple cloth", "Dorcas of Joppa", "Chloe of Corinth"],
  "Paul asks the Romans to welcome Phoebe in the Lord and assist her, for she had been a great help to many people, including Paul himself.", "ROM.16.1")

# 9 Psalms
s("psa", "Psalms", "Psalms 1–150", "Israel's prayers and praises: lament, trust, wisdom and kingship.")
q("In Psalm 1, what are the wicked compared to?",
  ["Chaff that the wind drives away", "A tree planted by streams", "Grass that withers by evening", "Smoke that vanishes"],
  "The righteous are like a fruitful tree by streams of water; the wicked are weightless chaff, blown away at the threshing floor.", "PSA.1.4")
q("In Psalm 2, where has God installed His King?",
  ["On Zion, His holy mountain", "On the throne of Egypt", "On Mount Sinai", "In the courts of Babylon"],
  "The nations rage against the LORD and His Anointed, but He laughs: “I have installed My King on Zion.” The New Testament applies this psalm to Jesus.", "PSA.2.6")
q("According to its heading, when did David write Psalm 3?",
  ["When he fled from his son Absalom", "When Saul hunted him at En-gedi", "When Nathan confronted him", "When he brought the ark to Jerusalem"],
  "Though many said God would not deliver him, David could lie down and sleep, trusting the LORD.", "PSA.3.1")
q("Which detail of Psalm 22 was fulfilled by the soldiers at the crucifixion?",
  ["Dividing his garments and casting lots", "Offering him wine mixed with gall", "Piercing his side with a spear", "Breaking the legs of the others"],
  "“They divide my garments among them and cast lots for my clothing.” John 19:24 quotes this. Jesus also cried its first line from the cross.", "PSA.22.18")
q("In Psalm 23, where does the LORD prepare a table for the psalmist?",
  ["In the presence of his enemies", "Beside still waters", "In the house of the LORD", "In the valley of the shadow of death"],
  "The image shifts from shepherd to host: God honours His guest openly, anointing his head with oil while enemies look on.", "PSA.23.5")
q("In Psalm 46, “Be still, and know that I am God” comes right after God does what?",
  ["Makes wars cease to the ends of the earth", "Calms a storm on the sea", "Gives rest on the Sabbath", "Answers a prayer for healing"],
  "In context the God who makes wars cease, breaking the bow and shattering the spear, speaks: “I will be exalted among the nations.”", "PSA.46.9")
q("What sacrifice does Psalm 51 say God will not despise?",
  ["A broken and contrite heart", "A burnt offering without blemish", "A tenth of all one's income", "A thank offering of praise"],
  "Written after Nathan confronted David about Bathsheba, the psalm says God does not delight in sacrifice alone; He wants a broken spirit.", "PSA.51.17")
q("Psalm 90, which says a thousand years are but a day in God's sight, is credited to whom?",
  ["Moses, the man of God", "David, the king", "Solomon, son of David", "Asaph, the singer"],
  "Its heading calls it “a prayer of Moses the man of God.” It also asks, “Teach us to number our days.”", "PSA.90.1")
q("Psalm 110 declares the king a priest forever after the order of whom?",
  ["Melchizedek", "Aaron", "Levi", "Zadok"],
  "Kings from Judah could not be Levitical priests. Hebrews 5–7 uses this verse to explain Jesus' priesthood.", "PSA.110.4")
q("In Psalm 118, what happens to the stone the builders rejected?",
  ["It becomes the cornerstone", "It is thrown into the sea", "It becomes an altar", "It crushes the builders"],
  "Jesus quoted this after the parable of the tenants, and Peter preached it to the Sanhedrin (Acts 4:11).", "PSA.118.22")
q("In Psalm 137, what did the captors in Babylon demand of the exiles?",
  ["To sing one of the songs of Zion", "To bow down to their gods", "To rebuild Babylon's walls", "To forget Jerusalem's name"],
  "By the rivers of Babylon the exiles hung up their harps: “How can we sing a song of the LORD in a foreign land?”", "PSA.137.3")
q("In Psalm 73, what changed the psalmist's envy of the prosperous wicked?",
  ["He entered God's sanctuary and saw their end", "He became rich himself", "The wicked repented", "An angel appeared to him"],
  "His feet had almost slipped. Only in God's presence did he understand their final destiny and say, “Whom have I in heaven but You?”", "PSA.73.17")

# 10 Big story
s("big", "The big story", "Genesis–Revelation", "How the Old and New Testaments fit together into one story.")
q("Matthew applies “Out of Egypt I called My Son” to Jesus. In Hosea, who was the “son”?",
  ["Israel, brought out of Egypt", "Joseph, sold into Egypt", "Moses, raised in Egypt", "Solomon, who married Pharaoh's daughter"],
  "Hosea 11:1 looks back to the exodus: “When Israel was a child, I loved him.” Matthew sees Jesus' return from Egypt retracing His people's story (Matthew 2:15).", "HOS.11.1")
q("Jesus said, “Just as Moses lifted up the snake in the wilderness…” What happened in that episode?",
  ["Bitten Israelites looked at a bronze snake and lived", "Moses' staff became a snake before Pharaoh", "A snake tempted Israel to worship idols", "Moses killed a snake that bit Aaron"],
  "In Numbers 21 God sent snakes among the complaining people. Whoever looked at the bronze snake on a pole lived — Jesus' picture of His being lifted up on the cross (John 3:14).", "NUM.21.9")
q("Hebrews 8 quotes at length which prophet's promise of a new covenant?",
  ["Jeremiah", "Ezekiel", "Isaiah", "Malachi"],
  "Jeremiah 31:31–34: the law written on hearts, and sins remembered no more. Hebrews argues Jesus mediates this better covenant.", "HEB.8.8")
q("What did Jesus mean by “the sign of the prophet Jonah”?",
  ["Three days and nights before coming out again", "Preaching to a foreign city", "Being thrown into a storm", "Sitting under a withered vine"],
  "“As Jonah was three days and three nights in the belly of the great fish, so the Son of Man will be three days and three nights in the heart of the earth.”", "MAT.12.40")
q("Through which prophet did God promise David a house and kingdom that would endure forever?",
  ["Nathan", "Samuel", "Gad", "Elijah"],
  "David wanted to build God a house (temple); God replied through Nathan that He would build David a house (dynasty). This Davidic covenant points to the Messiah.", "2SA.7.4")
q("Peter argued at Pentecost that Psalm 16 (“You will not abandon my soul”) can't be only about David. Why?",
  ["David died, was buried, and his tomb was still there", "David never wrote Psalm 16", "David was not a prophet", "David had been taken up to heaven"],
  "David's tomb was in Jerusalem “to this day,” so his body did see decay. As a prophet he spoke of the resurrection of the Christ.", "ACT.2.29")
q("Paul calls Christ “our Passover lamb” while urging the Corinthians to remove what?",
  ["The old leaven", "Their idols", "False apostles", "Their lawsuits"],
  "At Passover Israel cleared all leaven from their homes. Paul uses the image to tell the church to deal with sin among them.", "1CO.5.7")
q("How does Acts link itself to another book of the New Testament?",
  ["It mentions a first book written to Theophilus", "It names Mark as its author", "It quotes John's Gospel word for word", "It begins with Jesus' genealogy"],
  "Both Luke and Acts are addressed to Theophilus. Acts picks up where the “first book”, about all that Jesus began to do and teach, left off.", "ACT.1.1")
q("Ruth, the Moabite widow, was what relation to King David?",
  ["His great-grandmother", "His grandmother", "His mother-in-law", "His aunt"],
  "Ruth and Boaz had Obed, the father of Jesse, the father of David. Matthew 1 names her in Jesus' genealogy.", "RUT.4.17")
q("Which woman of Jericho is praised for her faith in Hebrews 11 and her deeds in James 2?",
  ["Rahab", "Deborah", "Jael", "Abigail"],
  "Rahab hid the Israelite spies (Joshua 2) and was spared when Jericho fell. Matthew 1:5 lists her as Boaz's mother.", "HEB.11.31")
q("Malachi promised God would send Elijah before the day of the LORD. Whom did Jesus identify as this “Elijah”?",
  ["John the Baptist", "Himself", "Elisha", "Peter"],
  "“And if you are willing to accept it, he is the Elijah who was to come.” Malachi 4:5 had promised Elijah before the great Day of the LORD.", "MAT.11.14")
q("Peter calls believers “a royal priesthood, a holy nation.” Where did God first say this to Israel?",
  ["At Mount Sinai", "At the burning bush", "At the Jordan crossing", "At Solomon's temple dedication"],
  "Before giving the law, God told Israel through Moses: “unto Me you shall be a kingdom of priests and a holy nation.” Peter applies it to the church (1 Peter 2:9).", "EXO.19.6")

json.dump(S, open("/tmp/claude-0/-home-user/2142c593-f5cf-5939-b1c3-01d06a43dc43/scratchpad/gq.json", "w"), ensure_ascii=False, indent=1)
print("ok")
