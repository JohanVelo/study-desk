# Hand corrections from the fact-check (each checked against the verses cited). Applied by final title.
def apply(P):
    T={r[0]:i for i,r in enumerate(P)}
    def row(t):
        assert t in T,t;return P[T[t]]
    def unlink(a,k,b):  # remove b from a's relation list k (0 father,1 mother,2 children,3 siblings,4 partners)
        ra,ib=row(a),T[b];ra[3][k]=[x for x in ra[3][k] if x!=ib]
    def link(a,k,b):
        ra,ib=row(a),T[b]
        if ib not in ra[3][k]:ra[3][k].append(ib)
    row("James (Brother of Jesus)")[2]="A brother of the Lord (Galatians 1:19; Mark 6:3). Jesus' brothers did not believe in him at first (John 7:5), but the risen Jesus appeared to James (1 Corinthians 15:7) and he became a leader of the church in Jerusalem (Acts 15:13; 21:18). He is traditionally the writer of the letter of James."
    row("Lot")[2]="Abraham's nephew, the son of Haran (Genesis 11:27). He went with Abram to Canaan, chose the well-watered plain near Sodom (Genesis 13), was rescued by Abram (Genesis 14), and escaped when Sodom was destroyed, though his wife looked back and became a pillar of salt (Genesis 19). Jesus speaks of 'the days of Lot' (Luke 17:28–32) and Peter calls him righteous (2 Peter 2:7)."
    r=row("Josiah (Zechariah 6:10)");r[2]="Josiah son of Zephaniah, at whose house the returned exiles were to gather with their gifts from Babylon (Zechariah 6:10). Zechariah 6:14 seems to call him Hen.";r[4]="Hen"
    r=row("Heli");r[2]="Named in Luke's family line of Jesus as the father of Joseph (Luke 3:23). Matthew names Joseph's father as Jacob (Matthew 1:16); one common view is that Luke traces the line through Mary, but the Bible does not say so."
    unlink("Heli",2,"Mary (Mother of Jesus)");unlink("Mary (Mother of Jesus)",0,"Heli");link("Heli",2,"Joseph (Mary's Husband)")
    r=row("Simon (Mark 1:30)");r[0]="Simon (father of Judas Iscariot)";r[5]=3;r[6]="JHN.6.71";r[7]=["JHN.6","JHN.13"]
    r=row("Jethro");r[4]="Reuel,Raguel";unlink("Jethro",2,"Eliasaph (Numbers 1:14)")
    r=row("Jethro");r[2]="The priest of Midian and Moses' father-in-law, also called Reuel (Exodus 2:18; 3:1). His daughter Zipporah married Moses. He visited Moses in the wilderness and advised him to share the work of judging the people (Exodus 18)."
    row("Lamech (father of Noah)")[2]="The son of Methuselah and father of Noah, seventh in the line from Adam through Seth (Genesis 5:25–31; Luke 3:36). When Noah was born he said, 'This one will comfort us in the labour and painful toil of our hands' (Genesis 5:29)."
    r=row("Reuben");r[2]=r[2].replace("malediction (48:4)","malediction (49:4)")
    r=row("Naphtali");r[2]=r[2].replace("the fifth son of Jacob","the sixth son of Jacob")
    row("Naomi")[2]="The wife of Elimelech and mother-in-law of Ruth. After losing her husband and sons in Moab she told the women of Bethlehem, 'Do not call me Naomi (pleasant); call me Mara (bitter)' (Ruth 1:20). Through Ruth and Boaz she held a grandson, Obed, the grandfather of David (Ruth 4:16–17)."
    row("Micah (Judges 17:1)")[1]="M";row("Micah (Jeremiah 26:18)")[1]="M"
    row("Micah (Jeremiah 26:18)")[0]="Micah the prophet"
    unlink("Alphaeus (Matthew 10:3)",2,"Lebbaeus Thaddaeus");unlink("Lebbaeus Thaddaeus",0,"Alphaeus (Matthew 10:3)")
    unlink("Lebbaeus Thaddaeus",3,"James (Son of Alphaeus)");unlink("James (Son of Alphaeus)",3,"Lebbaeus Thaddaeus")
    row("Alphaeus (Matthew 10:3)")[2]="The father of James, one of the twelve apostles (Matthew 10:3; Mark 3:18; Luke 6:15; Acts 1:13). Some identify him with Clopas (John 19:25), but the Bible does not say so."
    r=row("Mary (Mother of John Mark)");r[2]="The mother of John Mark. When Peter was freed from prison he went to her house in Jerusalem, where many were gathered praying (Acts 12:12). Her son Mark was a cousin of Barnabas (Colossians 4:10)."
    unlink("Mary (Mother of John Mark)",3,"Barnabas");unlink("Barnabas",3,"Mary (Mother of John Mark)")
    r=row("Micah (Judges 18:18)");r[0]="Mica (son of Mephibosheth)";r[2]="The son of Mephibosheth, Jonathan's son (2 Samuel 9:12; 1 Chronicles 8:34–35)."; r[5]=5;r[6]="2SA.9.12";r[7]=["2SA.9","1CH.8","1CH.9"]
    r=row("Onesimus");r[2]="A slave of Philemon who became a believer through Paul while Paul was in chains (Philemon 10). Paul sent him back to Philemon 'no longer as a slave, but better than a slave, as a beloved brother' (Philemon 16), and calls him 'our faithful and beloved brother, who is one of you' (Colossians 4:9). Tradition says he had run away; the letter only hints at it (Philemon 15, 18)."
    r=row("Jesus Christ");r[6]="MAT.1.1";unlink("Jesus Christ",0,"Joseph (Mary's Husband)")
    r=row("Andrew");r[2]=r[2].replace("the younger brother","the brother").replace("younger brother","brother")
    row("Daniel the prophet")[2]="A young man of Judah taken to Babylon and renamed Belteshazzar (Daniel 1:1–7). He served Babylonian and Persian kings, interpreted dreams, was thrown into the lions' den and kept safe (Daniel 6), and received visions of God's everlasting kingdom (Daniel 7–12). Ezekiel names a Daniel alongside Noah and Job (Ezekiel 14:14)."
    if "Shealtiel" in T: link("Zerubbabel",0,"Shealtiel")
    row("Herod the Great")[2]="King of Judea under Rome when Jesus was born. Wise men came to him looking for the newborn king of the Jews, and he ordered the killing of the boys in and around Bethlehem (Matthew 2). Zechariah and Elizabeth's story is dated to his reign (Luke 1:5)."
    row("Malachi")[2]="The prophet whose message closes the Old Testament in our Bibles; the book of Malachi carries his name (Malachi 1:1). The name means 'my messenger'."
    r=row("Agrippa");r[0]="Herod Agrippa II";r[2]=r[2].replace("Son of the foregoing,","The son of Herod Agrippa I,")
