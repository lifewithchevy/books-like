// SEO rec data — what gets baked into static HTML for each Books Like page.
//
// Middleware reads this map and renders the recs into the response body so
// Google sees the most valuable content (book titles + pitches + author names)
// without waiting for JavaScript.
//
// Kept in sync MANUALLY with index.html's searchData for the highest-traffic
// pages. We don't try to cover every book — just the ones in sitemap.xml's
// 0.9 and 0.8 priority tiers. The rest fall back to the basic SEO block.
//
// To update: edit this file, redeploy. The middleware reads it directly.

export const BOOKS_LIKE_RECS = {
  'fourth-wing': {
    sourceTitle: 'Fourth Wing',
    sourceAuthor: 'Rebecca Yarros',
    sourceAbout: "Fourth Wing is Rebecca Yarros's 2023 dragon-rider war academy romantasy that broke BookTok. Violet Sorrengail was supposed to enter the Scribe Quadrant. Instead her mother forces her into the brutal Riders Quadrant, where most cadets don't survive year one. Spicy, fast-paced, addictive — the book that converted thousands of contemporary romance readers into romantasy fans.",
    recs: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Mentioned in 29 of 40 "books like Fourth Wing" threads we pulled from Reddit. Fae courts, a morally grey love interest, and the slow burn of a generation. If you loved Xaden, you\'ll lose your mind over Rhysand.' },
      { title: 'Throne of Glass', author: 'Sarah J. Maas', why: 'Tied with ACOTAR for most-mentioned Fourth Wing readalike on Reddit (29 of 40 threads). An assassin competes to become the king\'s champion. Maas\'s first series, and the consensus crossover for Fourth Wing fans.' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'A sheltered Maiden discovers shattering truths about her world while falling for her bodyguard. Same slow-burn-to-inferno energy, same chosen-one-in-a-deadly-world vibes. Comes up in 9 of 40 Fourth Wing threads on Reddit.' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'A mortal girl in the faerie court schemes her way to power while sparring with a prince who despises her. 11 of 40 Fourth Wing threads on Reddit mention it. The YA fae enemies-to-lovers blueprint.' },
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'Deadly tournament structure that mirrors Basgiath\'s trials. A human enters a vampire competition where only one survives, and falls for the rival sworn to kill her. Shows up in 6 of 40 Fourth Wing threads on Reddit.' },
      { title: 'Red Rising', author: 'Pierce Brown', why: 'Not fantasy, but same DNA: a young underdog infiltrates an elite, brutal academy where the stakes are life and death. 11 of 40 Fourth Wing threads on Reddit suggest it as a wildcard pick.' },
    ],
    faqs: [
      { q: 'What makes a good Fourth Wing readalike?', a: 'Most readers want the same combination: a deadly academy or competition setting, morally grey love interest with serious slow-burn tension, fast pacing, and explicit-or-near-explicit spice. Bonus points for found family and dragons (or any magical creature bond).' },
      { q: 'Should I read ACOTAR or Throne of Glass first?', a: 'Both come up in nearly every Fourth Wing recommendation thread. ACOTAR has the faster romance payoff (you\'ll feel the swoon by book 2). Throne of Glass is a longer commitment (7 books) but pays off harder. Most Reddit readers say ACOTAR first.' },
      { q: 'What about When the Moon Hatched?', a: 'It has dragons and lots of TikTok buzz, but in our Reddit sample (40 threads, 4,105 comments) it was barely mentioned — readers who tried it had mixed reactions. We don\'t recommend it as a Fourth Wing readalike unless you specifically want the dragon-bond element.' },
    ],
  },

  'a-court-of-thorns-and-roses': {
    sourceTitle: 'A Court of Thorns and Roses',
    sourceAuthor: 'Sarah J. Maas',
    sourceAbout: "A Court of Thorns and Roses (ACOTAR) is the romantasy phenomenon that defined the modern genre. Feyre, a young huntress, is dragged into the fae lands after killing a wolf. What starts as a Beauty and the Beast retelling explodes into a sprawling epic about power, war, and the kind of love that remakes you. Most readers consider book 2 (A Court of Mist and Fury) where the series truly catches fire.",
    recs: [
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'Mentioned in 6 of 20 "books like ACOTAR" threads we pulled from Reddit. A sheltered Maiden, a mysterious guard, a world built on lies. Same slow-burn-to-inferno trajectory, same spice level.' },
      { title: 'Throne of Glass', author: 'Sarah J. Maas', why: 'The most-mentioned rec in "books like ACOTAR" threads on Reddit (9 of 20). Maas\'s first series. An assassin competes to become the king\'s champion. If you loved ACOTAR, this is your next obsession.' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'The faerie-court enemies-to-lovers blueprint. A mortal girl who refuses to be a victim, a cruel prince who can\'t stop watching her. Mentioned in 4 of 20 ACOTAR threads on Reddit.' },
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'Vampire-tournament dark romantasy with slow-burn enemies-to-allies and a morally grey love interest. Reads like ACOTAR meets Hunger Games. Mentioned in 3 of 20 ACOTAR threads on Reddit.' },
      { title: 'The Bridge Kingdom', author: 'Danielle L. Jensen', why: 'Arranged-marriage enemies-to-lovers with real political stakes. A warrior princess marries the enemy king she\'s been trained to destroy. The slow-burn "I should hate you" tension ACOTAR fans chase.' },
      { title: 'Kingdom of the Wicked', author: 'Kerri Maniscalco', why: 'A Sicilian witch, a Prince of Hell, and a murder mystery wrapped in enemies-to-lovers tension. Dark, atmospheric, exquisite slow burn.' },
    ],
    faqs: [
      { q: 'Do I have to read ACOTAR before Crescent City?', a: 'Crescent City reads as a standalone for ~2 books, then crosses over with the ACOTAR world. Most Reddit readers recommend ACOTAR first to avoid spoilers when the crossover happens.' },
      { q: 'Is Throne of Glass set in the same world as ACOTAR?', a: 'Different worlds, but same author and overlapping themes (assassins, courts, slow-burn romance). Throne of Glass starts more YA and grows up significantly by book 3.' },
      { q: 'What\'s the best non-Maas alternative?', a: 'From Blood and Ash by Jennifer L. Armentrout is the consensus non-Maas pick. Similar slow burn, similar spice level, similar chosen-one-in-a-deadly-world arc.' },
    ],
  },

  'it-ends-with-us': {
    sourceTitle: 'It Ends With Us',
    sourceAuthor: 'Colleen Hoover',
    sourceAbout: "It Ends With Us is Colleen Hoover\'s 2016 contemporary romance that became her most-discussed (and most-debated) novel. Lily Bloom falls for the brilliant, intense neurosurgeon Ryle Kincaid. The story tracks her difficult choices when love collides with the cycle of abuse she watched her mother survive. Blake Lively starred in the 2024 film adaptation.",
    recs: [
      { title: 'Verity', author: 'Colleen Hoover', why: 'Mentioned in 5 of 20 "books like It Ends With Us" threads we pulled from Reddit (33 comments). CoHo\'s psychological thriller. A writer hired to finish a bestselling author\'s series finds a horrifying manuscript hidden in her office.' },
      { title: 'Ugly Love', author: 'Colleen Hoover', why: 'Two people making a no-feelings arrangement that falls apart spectacularly. CoHo crossover that IEWU readers reach for next. The backstory chapters (told in second person) will ruin you.' },
      { title: 'Funny Story', author: 'Emily Henry', why: 'Mentioned in 4 of 20 IEWU threads on Reddit. Two people get dumped for each other\'s exes and decide to fake-date for revenge. Lighter than IEWU but the same emotional intelligence.' },
      { title: 'People We Meet on Vacation', author: 'Emily Henry', why: 'Two best friends, ten summer trips, one fight that ended it all. 3 of 20 IEWU threads on Reddit mention it. The friends-to-lovers-to-estranged arc that hits the same heart spot.' },
      { title: 'The Song of Achilles', author: 'Madeline Miller', why: 'Achilles and Patroclus, told from Patroclus\'s POV. The tearjerker IEWU readers cross over to on Reddit when they want devastation in a different setting.' },
      { title: 'A Little Life', author: 'Hanya Yanagihara', why: 'Four college friends in New York, and one carries a past so heavy the book takes 720 pages to begin telling it. Not romance, but the same "this book broke me" devastation IEWU readers seek.' },
    ],
    faqs: [
      { q: 'Should I read the sequel It Starts With Us?', a: 'It Starts With Us picks up where IEWU ends with Atlas\'s POV. Reader reception is mixed — many feel IEWU works better as a standalone. Read it if you need closure for Atlas + Lily; skip if you want IEWU to stand alone.' },
      { q: 'What are content warnings for IEWU?', a: 'Domestic abuse (graphic), pregnancy, child witnessing abuse, references to suicide. Read carefully or check the StoryGraph CW database before starting.' },
      { q: 'What\'s the best non-Hoover IEWU readalike?', a: 'Funny Story by Emily Henry comes up most in Reddit threads. Same emotional intelligence in a lighter contemporary setting.' },
    ],
  },

  'verity': {
    sourceTitle: 'Verity',
    sourceAuthor: 'Colleen Hoover',
    sourceAbout: "Verity is Colleen Hoover\'s 2018 psychological thriller. A struggling writer takes a job finishing a bestselling author\'s series, only to find a horrifying manuscript hidden in her office. The chapter-13 scene went so viral on BookTok it sold out bookstores nationwide. Amazon MGM adaptation announced.",
    recs: [
      { title: 'It Ends With Us', author: 'Colleen Hoover', why: 'Mentioned in 11 of 20 "books like Verity" threads we pulled from Reddit (112 comments — the strongest signal). CoHo crossover most Verity readers also love.' },
      { title: 'The Silent Patient', author: 'Alex Michaelides', why: '6 of 20 Verity threads on Reddit mention it. A famous painter shoots her husband five times and never speaks again. Her therapist becomes obsessed with making her talk. The ending rewrites everything.' },
      { title: 'Gone Girl', author: 'Gillian Flynn', why: '7 of 20 Verity threads on Reddit. The psychological thriller that started the era. Amy is the most complicated female character in modern fiction. CW: toxic relationship dynamics.' },
      { title: 'The Woman in Cabin 10', author: 'Ruth Ware', why: '3 of 20 Verity threads on Reddit. A travel journalist hears a woman thrown overboard from the cabin next door. Problem: no one was ever staying in that cabin. Netflix adaptation drove a resurgence.' },
      { title: 'The Housemaid', author: 'Freida McFadden', why: '3 of 20 Verity threads on Reddit. A woman with a hidden past takes a job as a housemaid for a wealthy couple. The twist ending is what made this BookTok\'s favorite thriller for two years.' },
      { title: 'Ugly Love', author: 'Colleen Hoover', why: '6 of 20 Verity threads on Reddit (25 comments). Two people making a no-feelings arrangement that falls apart. CoHo\'s emotional weight in romance form.' },
    ],
    faqs: [
      { q: 'Was Verity\'s ending real?', a: 'The book is famously ambiguous on this. Hoover has confirmed in interviews that the ending is intentionally up to the reader — both interpretations are valid.' },
      { q: 'Is Verity scary?', a: 'It\'s not horror, but it has some genuinely disturbing scenes (especially around children). Check trigger warnings before starting. Most Reddit readers describe it as "uncomfortable" rather than scary.' },
      { q: 'What should I read after Verity?', a: 'On Reddit, the most-mentioned next reads are It Ends With Us (Hoover\'s other big book), The Silent Patient (similar twist-driven thriller), and Gone Girl (the unreliable-narrator blueprint).' },
    ],
  },

  'the-seven-husbands-of-evelyn-hugo': {
    sourceTitle: 'The Seven Husbands of Evelyn Hugo',
    sourceAuthor: 'Taylor Jenkins Reid',
    sourceAbout: "The Seven Husbands of Evelyn Hugo is Taylor Jenkins Reid\'s 2017 historical fiction that became BookTok\'s defining novel. A legendary, reclusive Hollywood actress agrees to give her final interview to an unknown journalist. The interview unfolds her seven marriages, queer love, and secrets that reframe everything by the last chapter. Netflix adaptation in production.",
    recs: [
      { title: 'The Song of Achilles', author: 'Madeline Miller', why: 'Mentioned in 5 of 20 "books like Evelyn Hugo" threads on Reddit. Achilles and Patroclus, told from Patroclus\'s POV. Same tearjerker register, same queer love story you don\'t see coming.' },
      { title: 'Circe', author: 'Madeline Miller', why: '5 of 20 Evelyn Hugo threads on Reddit. Madeline Miller again, this time Greek myth retold from Circe\'s POV. Same epic character study, same lush prose.' },
      { title: 'Normal People', author: 'Sally Rooney', why: '5 of 20 Evelyn Hugo threads on Reddit. Connell and Marianne orbit each other from school to university, never quite together at the right time. Same painful intimacy.' },
      { title: 'A Little Life', author: 'Hanya Yanagihara', why: '4 of 20 Evelyn Hugo threads on Reddit. Four college friends in New York. One of them carries a past so heavy the book takes 720 pages to tell it. Devastating in the same way Evelyn Hugo is.' },
      { title: 'Yellowface', author: 'R.F. Kuang', why: '3 of 20 Evelyn Hugo threads on Reddit. A white author steals her dead friend\'s manuscript and publishes it as her own. Sharp publishing satire with the same morally complex protagonist.' },
      { title: 'The Midnight Library', author: 'Matt Haig', why: '3 of 20 Evelyn Hugo threads on Reddit. A woman between life and death finds a library of every life she could have lived. Same "what if?" emotional register.' },
    ],
    faqs: [
      { q: 'Is The Seven Husbands of Evelyn Hugo a love story?', a: 'Yes, but not the one you expect. The romance you\'ll remember isn\'t the one in the title. Going in blind is part of the experience.' },
      { q: 'What\'s TJR\'s best book after Evelyn Hugo?', a: 'Daisy Jones and the Six (rock band oral history, also has a Prime Video adaptation) and Malibu Rising are the consensus next reads. Both feature different members of the Riva family.' },
      { q: 'Will I cry reading Evelyn Hugo?', a: 'Almost universally yes. r/RomanceBooks readers consistently flag it as a top tearjerker. Have tissues ready, especially for the last 50 pages.' },
    ],
  },

  'the-song-of-achilles': {
    sourceTitle: 'The Song of Achilles',
    sourceAuthor: 'Madeline Miller',
    sourceAbout: "The Song of Achilles is Madeline Miller\'s 2011 retelling of the Iliad from Patroclus\'s POV. An awkward outcast prince meets the golden Achilles. What starts as an unlikely friendship becomes an all-consuming devotion. The tragedy is built in from the beginning — we know how the Iliad ends. Miller makes you fall in love anyway.",
    recs: [
      { title: 'Circe', author: 'Madeline Miller', why: 'Mentioned in 18 of 20 "books like Song of Achilles" threads on Reddit (278 comments — massive signal). Same author, same luminous prose, same Greek mythology reimagined with emotional depth.' },
      { title: 'A Little Life', author: 'Hanya Yanagihara', why: '6 of 20 TSOA threads on Reddit. About love between two men so complete it remakes everything around them. Set in modern New York. One of the most emotionally demanding novels ever written.' },
      { title: 'The House in the Cerulean Sea', author: 'TJ Klune', why: '4 of 20 TSOA threads on Reddit. A caseworker investigating a magical orphanage discovers found family in the most unexpected place. Same heart, lighter weight.' },
      { title: 'The Secret History', author: 'Donna Tartt', why: '4 of 20 TSOA threads on Reddit. A group of brilliant, doomed classics students at a small Vermont college. Dark academia, ancient Greece, friendship that destroys.' },
      { title: 'Piranesi', author: 'Susanna Clarke', why: '2 of 20 TSOA threads on Reddit. A man lives alone in a house of infinite halls and tides, cataloguing its statues. Quiet, profound, devastating in its own way.' },
      { title: 'Normal People', author: 'Sally Rooney', why: '3 of 20 TSOA threads on Reddit. Connell and Marianne orbit each other from school to college. Same painful intimacy in a contemporary setting.' },
    ],
    faqs: [
      { q: 'Do I need to know Greek mythology to read it?', a: 'No. Miller assumes nothing. If you\'ve heard of the Trojan War vaguely, you\'re overqualified. The book teaches you what you need to know.' },
      { q: 'Will Song of Achilles destroy me emotionally?', a: 'Yes. This is universally agreed on r/RomanceBooks and r/books. Have tissues. Don\'t read in public. The last 50 pages are particularly brutal.' },
      { q: 'Is Circe a sequel?', a: 'No — they\'re companion novels set in the same mythological world. Read in either order. Many readers prefer reading TSOA first because Circe\'s prose feels even more luminous in comparison.' },
    ],
  },

  'the-midnight-library': {
    sourceTitle: 'The Midnight Library',
    sourceAuthor: 'Matt Haig',
    sourceAbout: "The Midnight Library is Matt Haig\'s 2020 philosophical fiction. Nora Seed, between life and death, finds a library of every life she could have lived. Each book is a different path. Each path teaches her something about the life she actually has. The book people gift when someone is struggling.",
    recs: [
      { title: 'Recursion', author: 'Blake Crouch', why: 'Mentioned in 6 of 20 "books like Midnight Library" threads on Reddit (21 comments). A neuroscientist creates a chair that lets people relive memories — and accidentally shatters the timeline. Same mind-bending what-if structure.' },
      { title: 'Piranesi', author: 'Susanna Clarke', why: '4 of 20 Midnight Library threads on Reddit. A man lives in a vast, impossible house filled with statues and tides. Dreamlike and mysterious, he slowly questions everything.' },
      { title: 'The House in the Cerulean Sea', author: 'TJ Klune', why: '4 of 20 Midnight Library threads on Reddit. A caseworker investigating a magical orphanage discovers found family. Same warm, hopeful register.' },
      { title: 'A Little Life', author: 'Hanya Yanagihara', why: '3 of 20 Midnight Library threads on Reddit. The opposite of hopeful — but for readers who want emotional weight, this is the natural next step.' },
      { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', why: '2 of 20 Midnight Library threads on Reddit. Two friends build a video game empire across decades. About what we make and who we make it with.' },
      { title: 'The Song of Achilles', author: 'Madeline Miller', why: '3 of 20 Midnight Library threads on Reddit. The Iliad retold from Patroclus\'s POV. Different genre, same emotional precision.' },
    ],
    faqs: [
      { q: 'Is The Midnight Library a sad book?', a: 'It\'s about depression, but it ends hopefully. Most readers describe it as gently life-changing rather than devastating. The kind of book you finish feeling lighter.' },
      { q: 'What\'s the science-fiction version of The Midnight Library?', a: 'Recursion by Blake Crouch is the most-mentioned answer on Reddit. Same "different paths" structure with a tighter sci-fi plot and more propulsive pacing.' },
      { q: 'Should I read Matt Haig\'s other books?', a: 'The Comfort Book (essays) is the natural follow-up. The Humans is his other most-loved novel — an alien comes to Earth to understand humanity. Different vibe, same warmth.' },
    ],
  },

  'funny-story': {
    sourceTitle: 'Funny Story',
    sourceAuthor: 'Emily Henry',
    sourceAbout: "Funny Story is Emily Henry's 2024 contemporary romance and her sharpest book to date. Daphne gets dumped by her fiance for his childhood best friend. Then she ends up roommates with Miles, who happens to be the ex-boyfriend of the woman who stole her fiance. They decide to fake-date for revenge. Witty, painfully real, and the Emily Henry book BookTok built whole accounts around in 2024.",
    recs: [
      { title: 'Happy Place', author: 'Emily Henry', why: 'Emily Henry\'s 2023 hit, often paired with Funny Story in every "what should I read next" thread on r/RomanceBooks. A friend group reunites at a Maine cottage where one couple is pretending they didn\'t already break up. Same emotional intelligence, different setup.' },
      { title: 'Beach Read', author: 'Emily Henry', why: 'Henry\'s breakout and her best slow-burn. Two writers stuck next to each other for a summer make a bet to swap genres. The fake-arrangement-to-real-feelings template that Funny Story refines.' },
      { title: 'People We Meet on Vacation', author: 'Emily Henry', why: 'Two best friends, ten summer trips, one fight that ended it all. Netflix film adaptation dropped January 2026. The friends-to-lovers angst Funny Story readers chase next.' },
      { title: 'The Hating Game', author: 'Sally Thorne', why: 'The office enemies-to-lovers blueprint. Two executive assistants who share an office despise each other (or do they?). Same banter-to-feelings pipeline. Reread-able for years.' },
      { title: 'The Spanish Love Deception', author: 'Elena Armas', why: 'Fake-dating your hot coworker to a wedding in Spain. Combines all the tropes Funny Story flirts with into one extremely satisfying package. r/RomanceBooks regular.' },
      { title: 'The Love Hypothesis', author: 'Ali Hazelwood', why: 'A PhD candidate fake-dates a brooding professor to convince her best friend her love life is fine. STEM rom-com with the same sharp female lead voice.' },
    ],
    faqs: [
      { q: 'What\'s Emily Henry\'s best book to start with?', a: 'Beach Read is the consensus answer on r/RomanceBooks. Funny Story is her sharpest, Happy Place her most emotional. People We Meet on Vacation is the easiest entry point. All four work as standalones.' },
      { q: 'Is Funny Story spicy?', a: 'Yes, but not explicit. Two-to-three on most spice scales. The chemistry is more about banter and emotional intimacy than spice. Compare to Beach Read for similar level.' },
      { q: 'What should I read after every Emily Henry book?', a: 'Ali Hazelwood, Tessa Bailey, and Elena Armas are the most-recommended next-author crossovers. The Hating Game by Sally Thorne is the consensus single-book pick.' },
    ],
  },

  'quicksilver': {
    sourceTitle: 'Quicksilver',
    sourceAuthor: 'Callie Hart',
    sourceAbout: "Quicksilver is Callie Hart's 2024 dark romantasy that became a BookTok obsession. Saeris, a desert thief, accidentally opens a gateway and ends up bound to Kingfisher, a deadly fae warrior with his own agenda. Slow-burn enemies-to-lovers, gorgeous fae court worldbuilding, and 700 pages of pure romantasy momentum. The indie-published phenomenon that finally got a traditional re-release.",
    recs: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'The fae court blueprint Quicksilver builds on. Feyre and Rhysand set the standard for the morally grey fae male and the human woman who refuses to be a victim. Every Quicksilver fan eventually reads ACOTAR.' },
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'Dark vampire romantasy with the same slow-burn enemies-to-lovers tension. A human enters a deadly tournament where only one survives — and falls for the rival sworn to kill her. The most-recommended Quicksilver readalike on r/Romantasy.' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'A sheltered Maiden falls for her dangerous guard while everything she believed about her world crumbles. Same chosen-one-in-a-deadly-world arc Quicksilver runs on.' },
      { title: 'Fourth Wing', author: 'Rebecca Yarros', why: 'The other 2023-2024 romantasy phenomenon. War academy instead of fae court, dragons instead of magical creatures, but the same morally grey love interest and explicit-as-it-gets pacing.' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'The original fae enemies-to-lovers. Jude vs Cardan is the rivalry that defined a generation. If Quicksilver pulled you into fae politics, Black wrote the playbook.' },
      { title: 'When the Moon Hatched', author: 'Sarah A. Parker', why: 'A bounty hunter who can\'t die teams up with a dragon rider she shouldn\'t trust. Self-pub romantasy with the same lush prose and dragon-bond emotional core.' },
    ],
    faqs: [
      { q: 'Is Quicksilver part of a series?', a: 'Yes — book 1 of the Fae & Alchemy series. Book 2 is out and book 3 is coming. The series is planned for 4 books total. Each book ends on a cliffhanger so the wait between releases is real.' },
      { q: 'How spicy is Quicksilver?', a: 'Explicit. Multiple detailed scenes. Comparable to From Blood and Ash or Haunting Adeline on most reader spice scales. Not for sweet-romance readers.' },
      { q: 'What\'s the next book like Quicksilver?', a: 'The Serpent and the Wings of Night by Carissa Broadbent is the consensus next read on r/Romantasy. Same slow burn, same morally grey love interest, same dark fantasy worldbuilding.' },
    ],
  },

  'one-dark-window': {
    sourceTitle: 'One Dark Window',
    sourceAuthor: 'Rachel Gillig',
    sourceAbout: "One Dark Window is Rachel Gillig's gothic romantasy duology opener. Elspeth Spindle has a magical creature trapped in her mind — and a curse killing her kingdom. When she teams up with the masked highwayman known only as the Captain, she has to break the curse without losing herself in the process. Tarot magic, gothic atmosphere, and a slow-burn romance with a love interest who will absolutely ruin you. Concludes in Two Twisted Crowns.",
    recs: [
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'Same dark gothic atmosphere and slow-burn morally grey love interest. A human enters a vampire competition where only one survives. The most-recommended One Dark Window readalike on r/Romantasy.' },
      { title: 'Heartless Hunter', author: 'Kristen Ciccarelli', why: 'A witch and the witch-hunter sworn to capture her in a Roaring Twenties-inspired gothic fantasy. Same enemies-to-lovers across magical lines, same atmospheric prose, same complete duology format.' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'A sheltered Maiden falls for her dangerous guard while everything she believed about her world crumbles. Same dark romantasy with chosen-one stakes that One Dark Window plays in.' },
      { title: 'A Touch of Darkness', author: 'Scarlett St. Clair', why: 'A modern Hades and Persephone retelling with the same gothic-meets-romance atmosphere. Morally grey love interest, magical bargains, and a heroine who refuses to be reduced to a damsel.' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'The fae-court enemies-to-lovers blueprint Gillig builds on. A mortal girl in the faerie court schemes her way to power. The court intrigue + masked-stranger dynamic translates directly.' },
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'The romantasy foundation every reader eventually returns to. Fae courts, morally grey love interest, and a slow-burn romance that explodes in book 2. If you loved the Captain, Rhysand is waiting.' },
    ],
    faqs: [
      { q: 'Is One Dark Window a complete duology?', a: 'Yes — One Dark Window is book 1, Two Twisted Crowns is book 2 and concludes the story. The duology is complete, which is rare in romantasy. You can binge both without a multi-year wait.' },
      { q: 'How dark is One Dark Window?', a: 'Atmospherically dark (gothic horror vibes, cursed magic, body horror) rather than dark-romance dark. Spice level is moderate. Tropes lean gothic-romance more than spicy-romance.' },
      { q: 'What\'s Rachel Gillig\'s next series?', a: 'The Knight and the Moth, releasing 2025-2026. Different world, same gothic-romantasy DNA. Most r/Romantasy readers are pre-ordering on Gillig\'s name alone after the Shepherd King duology stuck the landing.' },
    ],
  },
};
