// SEO rec data, what gets baked into static HTML for each Books Like page.
//
// Middleware reads this map and renders the recs into the response body so
// Google sees the most valuable content (book titles + pitches + author names)
// without waiting for JavaScript.
//
// Kept in sync MANUALLY with index.html's searchData for the highest-traffic
// pages. We don't try to cover every book, just the ones in sitemap.xml's
// 0.9 and 0.8 priority tiers. The rest fall back to the basic SEO block.
//
// To update: edit this file, redeploy. The middleware reads it directly.

export const BOOKS_LIKE_RECS = {
  'fourth-wing': {
    sourceTitle: 'Fourth Wing',
    sourceAuthor: 'Rebecca Yarros',
    sourceAbout: "Ask r/Romantasy for the book that pulled them into the genre and Fourth Wing comes up more than almost anything else. Violet Sorrengail was supposed to live a quiet life in the Scribe Quadrant, instead her general mother throws her into the Riders Quadrant, a dragon-rider war college where cadets routinely die before graduation and the dragons themselves decide who's worth bonding with. Readers warn the first few chapters are a lot of names and worldbuilding, but the consensus is that once Violet hits the parapet it does NOT slow down. What the threads keep coming back to: a morally grey love interest (Xaden) who lives in your head for weeks, spice that genuinely delivers, and the most addictive pacing in modern romantasy. The book people credit with converting them from contemporary romance to dragons in a single weekend.",
    recs: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Feyre Archeron, a mortal huntress, is dragged into the enchanted fae lands after killing a wolf, and pulled into a world of dangerous courts, dark magic, and a love that will unmake and remake her. Mentioned in 29 of 40 "books like Fourth Wing" threads on Reddit. If you loved Xaden, you\'ll lose your mind over Rhysand.' , isbn: '9781635575569' },
      { title: 'Throne of Glass', author: 'Sarah J. Maas', why: 'Celaena Sardothien, condemned assassin, prisoner of the salt mines, is given one chance at freedom: win a brutal tournament to become the king\'s champion, competing against the deadliest warriors in the kingdom. Tied with ACOTAR for most-mentioned Fourth Wing readalike on Reddit (29 of 40 threads). Maas\'s first series, and the consensus crossover for Fourth Wing fans.' , isbn: '9781619630345' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'A sheltered Maiden discovers shattering truths about her world while falling for her bodyguard. Same slow-burn-to-inferno energy, same chosen-one-in-a-deadly-world vibes. Comes up in 9 of 40 Fourth Wing threads on Reddit.' , isbn: '9781952457760' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'A mortal girl in the faerie court schemes her way to power while sparring with a prince who despises her. 11 of 40 Fourth Wing threads on Reddit mention it. The YA fae enemies-to-lovers blueprint.' , isbn: '9781955876162' },
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'Deadly tournament structure that mirrors Basgiath\'s trials. A human enters a vampire competition where only one survives, and falls for the rival sworn to kill her. Shows up in 6 of 40 Fourth Wing threads on Reddit.' , isbn: '9781728295336' },
      { title: 'Red Rising', author: 'Pierce Brown', why: 'Darrow, a lowly miner from the lowest caste of a color-coded civilization, infiltrates the military elite as a spy, and must destroy the ruling class from the inside while pretending to be one of them. Not fantasy, but same DNA: brutal academy, life-or-death stakes, morally grey players. 11 of 40 Fourth Wing threads on Reddit suggest it as a wildcard pick.' , isbn: '9780345539786' },
    ],
    faqs: [
      { q: 'What makes a good Fourth Wing readalike?', a: 'Most readers want the same combination: a deadly academy or competition setting, morally grey love interest with serious slow-burn tension, fast pacing, and explicit-or-near-explicit spice. Bonus points for found family and dragons (or any magical creature bond).' },
      { q: 'Should I read ACOTAR or Throne of Glass first?', a: 'Both come up in nearly every Fourth Wing recommendation thread. ACOTAR has the faster romance payoff (you\'ll feel the swoon by book 2). Throne of Glass is a longer commitment (7 books) but pays off harder. Most Reddit readers say ACOTAR first.' },
      { q: 'What about When the Moon Hatched?', a: 'It has dragons and lots of TikTok buzz, but in our Reddit sample (40 threads, 4,105 comments) it was barely mentioned, readers who tried it had mixed reactions. We don\'t recommend it as a Fourth Wing readalike unless you specifically want the dragon-bond element.' },
    ],
  },

  'a-court-of-thorns-and-roses': {
    sourceTitle: 'A Court of Thorns and Roses',
    sourceAuthor: 'Sarah J. Maas',
    sourceAbout: "If you spend any time on r/Romantasy you already know ACOTAR is the book everyone measures the genre against. Feyre, a mortal huntress, kills a wolf in the woods and gets dragged across the wall into the fae lands, and what opens as a Beauty and the Beast retelling slowly becomes a sprawling epic about power, trauma, war, and a love that completely remakes her. Here's the thing every reader will tell you: book 1 is good, but ACOMAF (book 2) is the one that broke the genre wide open, the consensus is to push through the slower first book for the payoff that starts in the second. Rhysand is the blueprint half the genre's love interests are still chasing. If you want the foundational romantasy obsession, this is where readers say to start.",
    recs: [
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'Poppy is the Chosen, sheltered behind a veil, forbidden from human connection, raised to believe she will Ascend to the gods. Her guard Hawke is everything she shouldn\'t want, and he\'s hiding something that will shatter her world. Mentioned in 6 of 20 "books like ACOTAR" threads on Reddit. Same slow-burn-to-inferno trajectory, same spice level.' , isbn: '9781952457760' },
      { title: 'Throne of Glass', author: 'Sarah J. Maas', why: 'Celaena Sardothien, an assassin condemned to the salt mines, is given one chance at freedom: compete in a brutal tournament to become the king\'s champion. The most-mentioned rec in "books like ACOTAR" threads on Reddit (9 of 20). Maas\'s first series, and readers say it only gets better with each book.' , isbn: '9781619630345' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'The faerie-court enemies-to-lovers blueprint. A mortal girl who refuses to be a victim, a cruel prince who can\'t stop watching her. Mentioned in 4 of 20 ACOTAR threads on Reddit.' , isbn: '9781955876162' },
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'Vampire-tournament dark romantasy with slow-burn enemies-to-allies and a morally grey love interest. Reads like ACOTAR meets Hunger Games. Mentioned in 3 of 20 ACOTAR threads on Reddit.' , isbn: '9781728295336' },
      { title: 'The Bridge Kingdom', author: 'Danielle L. Jensen', why: 'Lara has been trained her entire life to spy on the Bridge Kingdom and eventually destroy it from within. Then she marries its king, and discovers he isn\'t what she was told. Arranged-marriage enemies-to-lovers with real political stakes and the slow-burn "I should hate you" tension ACOTAR fans chase.' , isbn: '9781734506204' },
      { title: 'Kingdom of the Wicked', author: 'Kerri Maniscalco', why: 'Emilia, a Sicilian girl who secretly practices dark blood magic, summons a Prince of Hell to help avenge her twin sister\'s brutal murder, and strikes a dangerous bargain she can\'t afford to lose. Dark, atmospheric, exquisite slow burn wrapped in enemies-to-lovers tension.' , isbn: '9780316703383' },
    ],
    faqs: [
      { q: 'Do I have to read ACOTAR before Crescent City?', a: 'Crescent City reads as a standalone for ~2 books, then crosses over with the ACOTAR world. Most Reddit readers recommend ACOTAR first to avoid spoilers when the crossover happens.' },
      { q: 'Is Throne of Glass set in the same world as ACOTAR?', a: 'Different worlds, but same author and overlapping themes (assassins, courts, slow-burn romance). Throne of Glass starts more YA and grows up significantly by book 3.' },
      { q: 'What\'s the best non-Maas alternative?', a: 'From Blood and Ash by Jennifer L. Armentrout is the consensus non-Maas pick. Similar slow burn, similar spice level, similar chosen-one-in-a-deadly-world arc.' },
    ],
  },

  'a-court-of-mist-and-fury': {
    sourceTitle: 'A Court of Mist and Fury',
    sourceAuthor: 'Sarah J. Maas',
    sourceAbout: "Ask r/Romantasy where the genre's obsession really starts and the answer is ACOMAF, book 2 of the ACOTAR series. It picks up with Feyre alive but coming apart at the seams, trapped by a bargain that keeps pulling her to the Night Court and the High Lord everyone warned her about. What unfolds is the healing arc, the found family, and the slowest of slow burns that readers credit with breaking the genre wide open. Rhysand is the love interest half of romantasy is still trying to recreate, the kind who treats the heroine like a partner instead of a prize. The consensus is that book 1 is the setup and this is the payoff, so push through ACOTAR for the book that turned a solid series into a phenomenon.",
    recs: [
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'Poppy is the Chosen, sheltered behind a veil and forbidden from human connection, and her guard Hawke is everything she shouldn\'t want. The other slow-burn-to-inferno everyone recommends in the same breath as ACOMAF: same fated-mates ache, same spice climb, same world-flipping reveal.' , isbn: '9781952457760' },
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'Oraya, a human raised among vampires, enters a deadly trial and ends up allied with the morally grey rival she should kill. A love interest who respects her strength and a slow burn that pays off hard. The "I should hate you but we\'re in this together" tension ACOMAF fans live for.' , isbn: '9781728295336' },
      { title: 'Fourth Wing', author: 'Rebecca Yarros', why: 'Violet is forced into a war college where dragons choose their riders and cadets die daily, and Xaden is the dangerous upperclassman who would burn the world down for her. If you loved Feyre finding her power beside a partner who never tries to shrink her, this hits the exact same note. Dragons, banter, found family.' , isbn: '9781649374042' },
      { title: 'A Touch of Darkness', author: 'Scarlett St. Clair', why: 'Persephone, a goddess hiding among mortals with powers she can barely control, strikes a reckless bargain with Hades and tumbles into an obsession that remakes them both. Fated, morally grey, and steamy, the dark-bargain energy ACOMAF readers crave.' , isbn: '9781949673296' },
      { title: 'The Bridge Kingdom', author: 'Danielle L. Jensen', why: 'Lara is trained her whole life to destroy the Bridge Kingdom from within, then marries its king and finds he isn\'t what she was told. Enemies-to-lovers with real political stakes and a partnership of equals, the slow-burn "I should hate you" tension ACOMAF readers chase.' , isbn: '9781734506204' },
      { title: 'House of Earth and Blood', author: 'Sarah J. Maas', why: 'Same author going grown-up and modern: a murder mystery in a neon city, a slow-burn partnership, and a found-family gut-punch. If it was the Inner Circle you fell for, Bryce and her crew are waiting.' , isbn: '9781635574043' },
    ],
    faqs: [
      { q: 'Do I have to read ACOTAR before A Court of Mist and Fury?', a: 'Yes, ACOMAF is book 2 and picks up directly after ACOTAR. Read book 1 first even though most readers agree ACOMAF is where the series truly takes off.' },
      { q: 'Is ACOMAF better than ACOTAR?', a: 'The r/Romantasy consensus is a resounding yes. ACOMAF introduces the Night Court, the found family, and the slow-burn romance readers credit with making the whole series a phenomenon.' },
      { q: 'What should I read after A Court of Silver Flames?', a: 'A Court of Silver Flames (book 4, Nesta\'s story) is the next ACOTAR book. For a non-Maas readalike, From Blood and Ash is the consensus pick.' },
    ],
  },

  'it-ends-with-us': {
    sourceTitle: 'It Ends With Us',
    sourceAuthor: 'Colleen Hoover',
    sourceAbout: "This is the Colleen Hoover book r/RomanceBooks argues about more than any other, and the one readers say to go in prepared for. Lily Bloom falls hard for Ryle Kincaid, a brilliant, intense neurosurgeon, and what starts as a swoony romance turns into something much heavier as love collides with the cycle of abuse Lily watched her mother survive. Readers are clear that it's marketed as romance but reads as something harder, so check the content warnings first, the domestic abuse is graphic. The consensus is that it's genuinely moving and worth reading, but it is not the cozy CoHo people sometimes expect. The 2024 Blake Lively film sent a whole new wave of readers to it.",
    recs: [
      { title: 'Verity', author: 'Colleen Hoover', why: 'Mentioned in 5 of 20 "books like It Ends With Us" threads we pulled from Reddit (33 comments). CoHo\'s psychological thriller. A writer hired to finish a bestselling author\'s series finds a horrifying manuscript hidden in her office.' , isbn: '9781538724736' },
      { title: 'Ugly Love', author: 'Colleen Hoover', why: 'Tate Collins can\'t resist her gorgeous, emotionally unavailable neighbor Miles, and they agree to a no-feelings, no-questions arrangement. Then his backstory (told in devastating second-person chapters) starts to surface. CoHo crossover that IEWU readers reach for next. The backstory chapters will ruin you.' , isbn: '9781476753188' },
      { title: 'Funny Story', author: 'Emily Henry', why: 'Mentioned in 4 of 20 IEWU threads on Reddit. Two people get dumped for each other\'s exes and decide to fake-date for revenge. Lighter than IEWU but the same emotional intelligence.' , isbn: '9780593441282' },
      { title: 'People We Meet on Vacation', author: 'Emily Henry', why: 'Two best friends, ten summer trips, one fight that ended it all. 3 of 20 IEWU threads on Reddit mention it. The friends-to-lovers-to-estranged arc that hits the same heart spot.' , isbn: '9781984806758' },
      { title: 'The Song of Achilles', author: 'Madeline Miller', why: 'Patroclus, an unlikely prince, meets Achilles, brilliant, golden, and destined for legend, and the devotion that grows between them reshapes both their lives. The tragedy is built in from the first page; Miller makes you fall in love anyway. The tearjerker IEWU readers cross over to when they want devastating love in a different setting.' , isbn: '9780062060624' },
      { title: 'A Little Life', author: 'Hanya Yanagihara', why: 'Four friends meet at a small Massachusetts college and follow each other to New York, where one of them, quiet, damaged Jude St. Francis, carries a childhood no one is allowed to ask about. Not romance, but the same "this book broke me" devastation IEWU readers seek.' , isbn: '9780385539258' },
    ],
    faqs: [
      { q: 'Should I read the sequel It Starts With Us?', a: 'It Starts With Us picks up where IEWU ends with Atlas\'s POV. Reader reception is mixed, many feel IEWU works better as a standalone. Read it if you need closure for Atlas + Lily; skip if you want IEWU to stand alone.' },
      { q: 'What are content warnings for IEWU?', a: 'Domestic abuse (graphic), pregnancy, child witnessing abuse, references to suicide. Read carefully or check the StoryGraph CW database before starting.' },
      { q: 'What\'s the best non-Hoover IEWU readalike?', a: 'Funny Story by Emily Henry comes up most in Reddit threads. Same emotional intelligence in a lighter contemporary setting.' },
    ],
  },

  'verity': {
    sourceTitle: 'Verity',
    sourceAuthor: 'Colleen Hoover',
    sourceAbout: "If you've been anywhere near BookTok or r/RomanceBooks you've seen people lose their minds over Verity, usually over one specific chapter. A struggling writer takes a job finishing a famous author's series and finds a hidden manuscript in the woman's office that reads like a confession. Readers describe it as the book they tore through in one sitting and then immediately needed to talk to someone about. The big online debate is the ending, it's deliberately ambiguous and people will fight you over which interpretation is real. It's genuinely disturbing in places (especially around the kids), so it's not for everyone, but it's the most-recommended 'I want a thriller that messes me up' pick going.",
    recs: [
      { title: 'It Ends With Us', author: 'Colleen Hoover', why: 'Lily Bloom falls for the brilliant, intense neurosurgeon Ryle Kincaid, and must make impossible choices when love collides with the cycles of her past. Mentioned in 11 of 20 "books like Verity" threads on Reddit (112 comments, the strongest signal). The CoHo crossover most Verity readers also love.' , isbn: '9781501110368' },
      { title: 'The Silent Patient', author: 'Alex Michaelides', why: '6 of 20 Verity threads on Reddit mention it. A famous painter shoots her husband five times and never speaks again. Her therapist becomes obsessed with making her talk. The ending rewrites everything.' , isbn: '9781250301697' },
      { title: 'Gone Girl', author: 'Gillian Flynn', why: 'On their five-year wedding anniversary, Nick Dunne\'s wife Amy goes missing. The investigation unravels a marriage of lies, performance, and mutual deception, and reveals two of the most unreliable narrators in modern fiction. 7 of 20 Verity threads on Reddit. The psychological thriller that defined the era.' , isbn: '9780307588371' },
      { title: 'The Woman in Cabin 10', author: 'Ruth Ware', why: '3 of 20 Verity threads on Reddit. A travel journalist hears a woman thrown overboard from the cabin next door. Problem: no one was ever staying in that cabin. Netflix adaptation drove a resurgence.' , isbn: '9781501132957' },
      { title: 'The Housemaid', author: 'Freida McFadden', why: '3 of 20 Verity threads on Reddit. A woman with a hidden past takes a job as a housemaid for a wealthy couple. The twist ending is what made this BookTok\'s favorite thriller for two years.' , isbn: '9781538777930' },
      { title: 'Ugly Love', author: 'Colleen Hoover', why: 'Tate Collins moves in with her brother and can\'t resist his gorgeous, emotionally unavailable neighbor Miles. They agree to a no-feelings, no-questions arrangement, and Miles\'s backstory (told in heartbreaking second-person chapters) changes everything. 6 of 20 Verity threads on Reddit. CoHo\'s emotional weight in romance form.' , isbn: '9781476753188' },
    ],
    faqs: [
      { q: 'Was Verity\'s ending real?', a: 'The book is famously ambiguous on this. Hoover has confirmed in interviews that the ending is intentionally up to the reader, both interpretations are valid.' },
      { q: 'Is Verity scary?', a: 'It\'s not horror, but it has some genuinely disturbing scenes (especially around children). Check trigger warnings before starting. Most Reddit readers describe it as "uncomfortable" rather than scary.' },
      { q: 'What should I read after Verity?', a: 'On Reddit, the most-mentioned next reads are It Ends With Us (Hoover\'s other big book), The Silent Patient (similar twist-driven thriller), and Gone Girl (the unreliable-narrator blueprint).' },
    ],
  },

  'the-seven-husbands-of-evelyn-hugo': {
    sourceTitle: 'The Seven Husbands of Evelyn Hugo',
    sourceAuthor: 'Taylor Jenkins Reid',
    sourceAbout: "This is the book r/books and r/RomanceBooks keep handing to people who swear they 'don't usually cry at books.' A legendary, reclusive Old Hollywood actress finally agrees to tell her life story, but only to one unknown journalist, and only she knows why. What unfolds across her seven marriages is a story about ambition, queer love, and the cost of fame, with a reveal in the final act that readers say reframes the entire book. The romance you'll actually remember isn't the one in the title, and going in blind is part of the magic. The near-universal warning from readers: have tissues ready for the last 50 pages.",
    recs: [
      { title: 'The Song of Achilles', author: 'Madeline Miller', why: 'Mentioned in 5 of 20 "books like Evelyn Hugo" threads on Reddit. Achilles and Patroclus, told from Patroclus\'s POV. Same tearjerker register, same queer love story you don\'t see coming.' , isbn: '9780062060624' },
      { title: 'Circe', author: 'Madeline Miller', why: 'Circe, daughter of the sun god Helios, discovers her gift as a witch, and spends centuries navigating gods, monsters, and mortals in a world that would prefer she didn\'t exist. 5 of 20 Evelyn Hugo threads on Reddit. Madeline Miller again, same luminous prose, same epic character study of a woman finding her own power.' , isbn: '9780316556347' },
      { title: 'Normal People', author: 'Sally Rooney', why: '5 of 20 Evelyn Hugo threads on Reddit. Connell and Marianne orbit each other from school to university, never quite together at the right time. Same painful intimacy.' , isbn: '9780571334650' },
      { title: 'A Little Life', author: 'Hanya Yanagihara', why: 'Four friends meet at a small Massachusetts college and follow each other to New York, where one of them, quiet, damaged Jude St. Francis, carries a childhood no one is allowed to ask about. 4 of 20 Evelyn Hugo threads on Reddit. The book takes 720 pages to fully tell it, and it earns every one.' , isbn: '9780385539258' },
      { title: 'Yellowface', author: 'R.F. Kuang', why: '3 of 20 Evelyn Hugo threads on Reddit. A white author steals her dead friend\'s manuscript and publishes it as her own. Sharp publishing satire with the same morally complex protagonist.' , isbn: '9780063250840' },
      { title: 'The Midnight Library', author: 'Matt Haig', why: '3 of 20 Evelyn Hugo threads on Reddit. A woman between life and death finds a library of every life she could have lived. Same "what if?" emotional register.' , isbn: '9780525559474' },
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
    sourceAbout: "Ask r/books for the novel that emotionally destroyed them and Song of Achilles is in nearly every thread. It's the Iliad retold from Patroclus's point of view, an awkward exiled prince who falls into orbit around the golden, impossible Achilles, and the devotion between them becomes the whole story. You already know how the Trojan War ends, and Miller makes you fall in love anyway, which is exactly why it wrecks people. You don't need to know any Greek mythology going in; readers say the prose teaches you everything you need. The most common piece of advice in the threads: do not read the last 50 pages in public.",
    recs: [
      { title: 'Circe', author: 'Madeline Miller', why: 'Circe, daughter of the sun god Helios, discovers her gift as a witch, and spends centuries navigating gods, monsters, and mortals in a world that would prefer she didn\'t exist. Mentioned in 18 of 20 "books like Song of Achilles" threads on Reddit (278 comments, massive signal). Same author, same luminous prose, same Greek mythology reimagined with emotional depth.' , isbn: '9780316556347' },
      { title: 'A Little Life', author: 'Hanya Yanagihara', why: 'Four friends meet at a small Massachusetts college and follow each other to New York, where one of them, quiet, damaged, extraordinary Jude St. Francis, carries a childhood no one is allowed to ask about. 6 of 20 TSOA threads on Reddit. One of the most emotionally demanding novels ever written.' , isbn: '9780385539258' },
      { title: 'The House in the Cerulean Sea', author: 'TJ Klune', why: '4 of 20 TSOA threads on Reddit. A caseworker investigating a magical orphanage discovers found family in the most unexpected place. Same heart, lighter weight.' , isbn: '9781250217288' },
      { title: 'The Secret History', author: 'Donna Tartt', why: 'Richard Papen transfers to a small Vermont college and falls in with an elite, secretive group of classics students who seem to live by rules only they understand. The novel opens with a murder, the mystery is only why. 4 of 20 TSOA threads on Reddit. Dark academia at its finest.' , isbn: '9781400031702' },
      { title: 'Piranesi', author: 'Susanna Clarke', why: 'Piranesi lives in a vast, impossible house of infinite halls where statues fill the upper tiers and tides pour through the lower ones. He believes only two people exist in the world. He is wrong. 2 of 20 TSOA threads on Reddit. Quiet, profound, devastating in its own way.' , isbn: '9781635575637' },
      { title: 'Normal People', author: 'Sally Rooney', why: '3 of 20 TSOA threads on Reddit. Connell and Marianne orbit each other from school to college. Same painful intimacy in a contemporary setting.' , isbn: '9780571334650' },
    ],
    faqs: [
      { q: 'Do I need to know Greek mythology to read it?', a: 'No. Miller assumes nothing. If you\'ve heard of the Trojan War vaguely, you\'re overqualified. The book teaches you what you need to know.' },
      { q: 'Will Song of Achilles destroy me emotionally?', a: 'Yes. This is universally agreed on r/RomanceBooks and r/books. Have tissues. Don\'t read in public. The last 50 pages are particularly brutal.' },
      { q: 'Is Circe a sequel?', a: 'No, they\'re companion novels set in the same mythological world. Read in either order. Many readers prefer reading TSOA first because Circe\'s prose feels even more luminous in comparison.' },
    ],
  },

  'the-midnight-library': {
    sourceTitle: 'The Midnight Library',
    sourceAuthor: 'Matt Haig',
    sourceAbout: "This is the book r/suggestmeabook recommends over and over when someone's going through it. Nora Seed, at the lowest point of her life, lands in a library that sits between life and death, every book a different version of the life she could have lived if she'd made other choices. Readers describe it as gently life-changing rather than devastating; it deals with depression head-on but lands somewhere hopeful. The consensus is that it's not a complex plot novel, it's a feelings novel, and going in expecting that makes all the difference. The book people buy a second copy of just to give away.",
    recs: [
      { title: 'Recursion', author: 'Blake Crouch', why: 'Mentioned in 6 of 20 "books like Midnight Library" threads on Reddit (21 comments). A neuroscientist creates a chair that lets people relive memories, and accidentally shatters the timeline. Same mind-bending what-if structure.' , isbn: '9781524759780' },
      { title: 'Piranesi', author: 'Susanna Clarke', why: 'Piranesi lives in a vast, impossible house of infinite halls where statues fill the upper tiers and tides pour through the lower ones. He believes only two people exist in the world. He is wrong. 4 of 20 Midnight Library threads on Reddit. Dreamlike and mysterious, the kind of novel that rewires how you read.' , isbn: '9781635575637' },
      { title: 'The House in the Cerulean Sea', author: 'TJ Klune', why: '4 of 20 Midnight Library threads on Reddit. A caseworker investigating a magical orphanage discovers found family. Same warm, hopeful register.' , isbn: '9781250217288' },
      { title: 'A Little Life', author: 'Hanya Yanagihara', why: 'Four friends meet at a small Massachusetts college and follow each other to New York, where one of them carries a childhood no one is allowed to ask about. 3 of 20 Midnight Library threads on Reddit. The opposite of hopeful, but for readers who want emotional weight, this is the natural next step.' , isbn: '9780385539258' },
      { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', why: 'Sam Masur and Sadie Green keep finding each other across three decades, as rivals, collaborators, and something harder to name, building game worlds together while their real ones keep falling apart. 2 of 20 Midnight Library threads on Reddit. About art, ambition, and the people we make things for.' , isbn: '9780593321201' },
      { title: 'The Song of Achilles', author: 'Madeline Miller', why: '3 of 20 Midnight Library threads on Reddit. The Iliad retold from Patroclus\'s POV. Different genre, same emotional precision.' , isbn: '9780062060624' },
    ],
    faqs: [
      { q: 'Is The Midnight Library a sad book?', a: 'It\'s about depression, but it ends hopefully. Most readers describe it as gently life-changing rather than devastating. The kind of book you finish feeling lighter.' },
      { q: 'What\'s the science-fiction version of The Midnight Library?', a: 'Recursion by Blake Crouch is the most-mentioned answer on Reddit. Same "different paths" structure with a tighter sci-fi plot and more propulsive pacing.' },
      { q: 'Should I read Matt Haig\'s other books?', a: 'The Comfort Book (essays) is the natural follow-up. The Humans is his other most-loved novel, an alien comes to Earth to understand humanity. Different vibe, same warmth.' },
    ],
  },

  'funny-story': {
    sourceTitle: 'Funny Story',
    sourceAuthor: 'Emily Henry',
    sourceAbout: "r/RomanceBooks basically declared this peak Emily Henry the week it dropped. Daphne gets dumped by her fiancé for his childhood best friend, and ends up reluctantly rooming with Miles, who happens to be the ex of the woman who stole her fiancé. Naturally, they fake-date for revenge. Readers single out the dialogue as her sharpest yet, and the emotional intelligence underneath the banter is what keeps people rereading it. Spice sits on the lower-explicit side (2-3); the appeal is the slow burn and the wit. The go-to rec when someone wants a contemporary that's funny but actually has a heart.",
    recs: [
      { title: 'Happy Place', author: 'Emily Henry', why: 'Emily Henry\'s 2023 hit, often paired with Funny Story in every "what should I read next" thread on r/RomanceBooks. A friend group reunites at a Maine cottage where one couple is pretending they didn\'t already break up. Same emotional intelligence, different setup.' , isbn: '9780593638446' },
      { title: 'Beach Read', author: 'Emily Henry', why: 'Henry\'s breakout and her best slow-burn. Two writers stuck next to each other for a summer make a bet to swap genres. The fake-arrangement-to-real-feelings template that Funny Story refines.' , isbn: '9780593336120' },
      { title: 'People We Meet on Vacation', author: 'Emily Henry', why: 'Two best friends, ten summer trips, one fight that ended it all. Netflix film adaptation dropped January 2026. The friends-to-lovers angst Funny Story readers chase next.' , isbn: '9781984806758' },
      { title: 'The Hating Game', author: 'Sally Thorne', why: 'The office enemies-to-lovers blueprint. Two executive assistants who share an office despise each other (or do they?). Same banter-to-feelings pipeline. Reread-able for years.' , isbn: '9780063063532' },
      { title: 'The Spanish Love Deception', author: 'Elena Armas', why: 'Fake-dating your hot coworker to a wedding in Spain. Combines all the tropes Funny Story flirts with into one extremely satisfying package. r/RomanceBooks regular.' , isbn: '9781668003275' },
      { title: 'The Love Hypothesis', author: 'Ali Hazelwood', why: 'A PhD candidate fake-dates a brooding professor to convince her best friend her love life is fine. STEM rom-com with the same sharp female lead voice.' , isbn: '9780593336823' },
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
    sourceAbout: "Quicksilver is the book r/Romantasy would not stop posting about in 2024, and the hype mostly holds up. Saeris, a desert thief scraping by in a dying world, accidentally opens a gateway and gets yanked into a frozen fae realm, bound to Kingfisher, a deadly, centuries-old warrior with his own agenda. Readers call it a masterclass slow burn: 700 pages of tension, gorgeous fae-court worldbuilding, and spice that builds and then absolutely detonates. Fair warning from the threads, it ends on a cliffhanger and the wait between books is real. The indie sensation that landed a traditional re-release because demand was that loud.",
    recs: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Feyre Archeron, a mortal huntress, is dragged into the enchanted fae lands after killing a wolf, and pulled into a world of dangerous courts, dark magic, and a love that will unmake and remake her. The fae court blueprint Quicksilver builds on. Every Quicksilver fan eventually reads ACOTAR.' , isbn: '9781635575569' },
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'Dark vampire romantasy with the same slow-burn enemies-to-lovers tension. A human enters a deadly tournament where only one survives, and falls for the rival sworn to kill her. The most-recommended Quicksilver readalike on r/Romantasy.' , isbn: '9781728295336' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'A sheltered Maiden falls for her dangerous guard while everything she believed about her world crumbles. Same chosen-one-in-a-deadly-world arc Quicksilver runs on.' , isbn: '9781952457760' },
      { title: 'Fourth Wing', author: 'Rebecca Yarros', why: 'The other 2023-2024 romantasy phenomenon. War academy instead of fae court, dragons instead of magical creatures, but the same morally grey love interest and explicit-as-it-gets pacing.' , isbn: '9781649374042' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'The original fae enemies-to-lovers. Jude vs Cardan is the rivalry that defined a generation. If Quicksilver pulled you into fae politics, Black wrote the playbook.' , isbn: '9781955876162' },
      { title: 'When the Moon Hatched', author: 'Sarah A. Parker', why: 'A bounty hunter who can\'t die teams up with a dragon rider she shouldn\'t trust. Self-pub romantasy with the same lush prose and dragon-bond emotional core.' , isbn: '9781250353726' },
    ],
    faqs: [
      { q: 'Is Quicksilver part of a series?', a: 'Yes, book 1 of the Fae & Alchemy series. Book 2 is out and book 3 is coming. The series is planned for 4 books total. Each book ends on a cliffhanger so the wait between releases is real.' },
      { q: 'How spicy is Quicksilver?', a: 'Explicit. Multiple detailed scenes. Comparable to From Blood and Ash or Haunting Adeline on most reader spice scales. Not for sweet-romance readers.' },
      { q: 'What\'s the next book like Quicksilver?', a: 'The Serpent and the Wings of Night by Carissa Broadbent is the consensus next read on r/Romantasy. Same slow burn, same morally grey love interest, same dark fantasy worldbuilding.' },
    ],
  },

  'one-dark-window': {
    sourceTitle: 'One Dark Window',
    sourceAuthor: 'Rachel Gillig',
    sourceAbout: "When r/Romantasy talks about gothic romantasy done right, One Dark Window is the title that comes up first. Elspeth has a centuries-old monster living in her head (the Nightmare, who readers end up adoring far more than they expect to) and a curse slowly killing her kingdom. She teams up with a masked highwayman called the Captain to break it without losing herself in the process. Readers love it for the atmosphere, tarot-card magic, fog and dread, and a slow burn that pays off. The detail the threads always flag: it's a complete duology that finishes in Two Twisted Crowns, so no multi-year cliffhanger wait. Spice is moderate; the real draw is the gothic mood.",
    recs: [
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'Same dark gothic atmosphere and slow-burn morally grey love interest. A human enters a vampire competition where only one survives. The most-recommended One Dark Window readalike on r/Romantasy.' , isbn: '9781728295336' },
      { title: 'Heartless Hunter', author: 'Kristen Ciccarelli', why: 'A witch and the witch-hunter sworn to capture her in a Roaring Twenties-inspired gothic fantasy. Same enemies-to-lovers across magical lines, same atmospheric prose, same complete duology format.' , isbn: '9781250866905' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'A sheltered Maiden falls for her dangerous guard while everything she believed about her world crumbles. Same dark romantasy with chosen-one stakes that One Dark Window plays in.' , isbn: '9781952457760' },
      { title: 'A Touch of Darkness', author: 'Scarlett St. Clair', why: 'Persephone, goddess of spring, is drawn into a bargain with Hades that turns her carefully constructed world upside down. A modern mythology retelling with the same gothic-meets-romance atmosphere as One Dark Window, morally grey love interest, magical bargains, a heroine who refuses to be powerless.' , isbn: '9781949039153' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'The fae-court enemies-to-lovers blueprint Gillig builds on. A mortal girl in the faerie court schemes her way to power. The court intrigue + masked-stranger dynamic translates directly.' , isbn: '9781955876162' },
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Feyre Archeron, a mortal huntress, is dragged into the enchanted fae lands after killing a wolf, and pulled into a world of dangerous courts, dark magic, and a love that will unmake and remake her. The romantasy foundation every reader eventually returns to. If you loved the Captain, Rhysand is waiting.' , isbn: '9781635575569' },
    ],
    faqs: [
      { q: 'Is One Dark Window a complete duology?', a: 'Yes, One Dark Window is book 1, Two Twisted Crowns is book 2 and concludes the story. The duology is complete, which is rare in romantasy. You can binge both without a multi-year wait.' },
      { q: 'How dark is One Dark Window?', a: 'Atmospherically dark (gothic horror vibes, cursed magic, body horror) rather than dark-romance dark. Spice level is moderate. Tropes lean gothic-romance more than spicy-romance.' },
      { q: 'What\'s Rachel Gillig\'s next series?', a: 'The Knight and the Moth, releasing 2025-2026. Different world, same gothic-romantasy DNA. Most r/Romantasy readers are pre-ordering on Gillig\'s name alone after the Shepherd King duology stuck the landing.' },
    ],
  },

  'iron-flame': {
    sourceTitle: 'Iron Flame',
    sourceAuthor: 'Rebecca Yarros',
    sourceAbout: "Iron Flame is the Fourth Wing sequel that took over r/Romantasy for a solid month when it dropped, and step one in every thread is 'read Fourth Wing first,' because this won't work without it. Violet survived her first year at Basgiath; now the war, Xaden, and the entire kingdom turn out to be built on lies. Readers are honest that the middle third drags and the second-year-of-school structure tested some people's patience, but the consensus is that the last 100 pages are the best thing Yarros has written. Bigger stakes, darker reveals, and a relationship that gets genuinely complicated. If Fourth Wing hooked you, the threads say push through the slow middle; the payoff lands.",
    recs: [
      { title: 'Fourth Wing', author: 'Rebecca Yarros', why: 'Book 1 of Empyrean. Non-negotiable, Iron Flame doesn\'t work without it. Read Fourth Wing first, then come back. Every r/Romantasy reader\'s entry point to Yarros.' , isbn: '9781649374042' },
      { title: 'Onyx Storm', author: 'Rebecca Yarros', why: 'Book 3 of Empyrean, released 2025. The continuation of Violet and Xaden\'s story. If Iron Flame wrecked you, Onyx Storm is next, pre-order territory for the entire fandom.' , isbn: '9781649374189' },
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Feyre Archeron, a mortal huntress, is dragged into the enchanted fae lands after killing a wolf, and pulled into a world of dangerous courts, dark magic, and a love that will unmake and remake her. The romantasy foundation Yarros builds on. The most-recommended Empyrean readalike on r/Romantasy.' , isbn: '9781635575569' },
      { title: 'Throne of Glass', author: 'Sarah J. Maas', why: 'An assassin competes to become the king\'s champion. Same Maas universe-adjacent intensity that Yarros readers gravitate toward, military training, political stakes, slow-burn romance.' , isbn: '9781619630345' },
      { title: 'Quicksilver', author: 'Callie Hart', why: 'The 2024 romantasy breakout, fae warrior, deadly bargain, 700 pages of unrelenting tension. The book Iron Flame fans pick up while waiting for Onyx Storm.' , isbn: '9781649376291' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'The blueprint for the romantasy formula Yarros perfected. A sheltered Chosen falls for her dangerous guard. Same scale, same spice, same slow burn.' , isbn: '9781952457760' },
    ],
    faqs: [
      { q: 'Do I have to read Fourth Wing first?', a: 'Yes, absolutely. Iron Flame is a direct continuation, it starts roughly where Fourth Wing ended and assumes you know every character, every relationship, every political faction. Skipping book 1 will spoil the best twists and ruin the emotional payoff.' },
      { q: 'Is Iron Flame as good as Fourth Wing?', a: 'r/Romantasy is split. Most readers agree Iron Flame is heavier, slower in the middle third, and emotionally darker. The payoff in the last 100 pages is often called the best of the series so far. Reread Fourth Wing first if it\'s been a while.' },
      { q: 'When does Onyx Storm come out?', a: 'Onyx Storm (book 3 of Empyrean) released January 2025. Book 4 is announced. The series is planned for 5 books total. The wait between books is real, which is why the r/Romantasy community devours every book on release weekend.' },
    ],
  },

  'crescent-city': {
    sourceTitle: 'House of Earth and Blood (Crescent City)',
    sourceAuthor: 'Sarah J. Maas',
    sourceAbout: "Crescent City is the Maas series r/Romantasy tells you to brace for, slow to start, then completely consuming. Bryce Quinlan, a half-fae party girl with a gallery job, loses everyone she loves in one brutal night, and two years later gets pulled back into the case alongside Hunt Athalar, a fallen-angel assassin wearing a slave's halo. Readers warn that the first ~150 pages are a dense modern-fantasy info-dump, but the back half is the part everyone screenshots. It's spicier than ACOTAR or Throne of Glass, this was Maas's first fully adult series. The big consensus note: read ACOTAR first, because the worlds explicitly cross over by book 3 and you don't want it spoiled.",
    recs: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Feyre Archeron, a mortal huntress, is dragged into the enchanted fae lands after killing a wolf, and pulled into a world of dangerous courts, dark magic, and a love that will unmake and remake her. Same author, same universe (the worlds explicitly cross over by book 3 of Crescent City). Most readers say to read ACOTAR before Crescent City to enjoy the crossover unspoiled.' , isbn: '9781635575569' },
      { title: 'Throne of Glass', author: 'Sarah J. Maas', why: 'Maas\'s longest series, an assassin competes to become the king\'s champion. Different tone from Crescent City but same author DNA, same morally grey love interest energy, same emotional payoff across the series.' , isbn: '9781619630345' },
      { title: 'Fourth Wing', author: 'Rebecca Yarros', why: 'The current peak of romantasy. Dragon-rider war academy, morally grey love interest, slow burn that explodes. Crescent City fans typically read Empyrean next while waiting for the next Maas drop.' , isbn: '9781649374042' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'YA fae enemies-to-lovers blueprint. A mortal in the faerie court schemes against the prince who despises her. Lighter than Crescent City but same political-romantic tension Maas readers chase.' , isbn: '9781955876162' },
      { title: 'Quicksilver', author: 'Callie Hart', why: 'Dark romantasy with fae court worldbuilding and a slow-burn morally grey love interest. The 2024 breakout that filled the gap between Maas releases for many Crescent City readers.' , isbn: '9781649376291' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'A sheltered chosen one falls for her dangerous guard. Same chosen-one-in-a-world-of-lies arc Bryce navigates, with the same explicit slow burn and shocking twists.' , isbn: '9781952457760' },
    ],
    faqs: [
      { q: 'Do I need to read ACOTAR before Crescent City?', a: 'Crescent City reads as a complete standalone for the first two books. The world crossover happens in House of Sky and Breath (book 2) and especially House of Flame and Shadow (book 3). Most r/Romantasy readers strongly recommend reading ACOTAR first to enjoy the crossover unspoiled.' },
      { q: 'How many Crescent City books are there?', a: 'Three books so far: House of Earth and Blood, House of Sky and Breath, House of Flame and Shadow. Maas has confirmed more books are coming but no release dates as of 2025. Book 3 ends on cliffhangers across multiple plotlines.' },
      { q: 'Is Crescent City spicy?', a: 'Yes, significantly spicier than ACOTAR book 1 or Throne of Glass. Crescent City was Maas\'s first explicitly adult series. Spice level 3-4 on most reader scales. The slow burn pays off in dedicated, multi-scene spice.' },
    ],
  },

  'from-blood-and-ash': {
    sourceTitle: 'From Blood and Ash',
    sourceAuthor: 'Jennifer L. Armentrout',
    sourceAbout: "Real talk, I haven't read this one yet (it's on my list), so instead of faking it, here's what r/Romantasy actually says, because they will not stop recommending it. From Blood and Ash is the one readers credit with pulling them out of reading slumps and turning them into romantasy people for life. Poppy is the Maiden, raised in total isolation, veiled, forbidden to speak or be touched because she's supposedly chosen by the gods to Ascend. Then Hawke shows up as her new personal guard, and the consensus is the banter is genuinely funny and the chemistry is immediate. Here's the one thing everyone says to know going in: the first third is slower, JLA takes her time with the worldbuilding (the Ascension, the Craven, the kingdom of Solis), and more than a few readers admit they almost DNF'd before it clicked. The verdict is unanimous, though: push through, because the back half does NOT let up. The slow burn is the real deal, not insta-love dressed up. When it finally happens the spice is a legit 4.5/5, multiple scenes, very explicit, and readers say it lands precisely because of how long the wait is. Then THE chapter-26 reveal hits and recontextualizes everything; the people who went in blind swear that's the move, so don't let anyone spoil it. Fair warning: it ends on a brutal cliffhanger, so have A Kingdom of Flesh and Fire ready. Six books deep, it still tops every 'what got you into romantasy' thread. If you want a found-family fae epic with a heroine who goes from sheltered to absolutely feral and an MMC who's equal parts swoon and menace, this is the one the community keeps handing to new readers.",
    recs: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'If you finished FBAA and immediately needed the next obsession, this is the one r/Romantasy points everyone to (it shows up in about half the threads). Feyre kills a wolf in the woods and gets hauled across the wall into the fae lands, and what starts as a Beauty and the Beast retelling turns into something way darker and spicier by book 2. Readers say to stick around for ACOMAF, that\'s the book they credit with breaking the genre open. The consensus: Rhysand will live in your head rent-free the same way Hawke does.' , isbn: '9781635575569' },
      { title: 'Fourth Wing', author: 'Rebecca Yarros', why: 'The current crossover everyone in FBAA threads is recommending. Dragon-rider war college where they straight up let cadets die in year one, a heroine who\'s physically not supposed to survive but is too stubborn to, and Xaden, morally grey, secretive, and exactly the kind of dangerous love interest Hawke fans go for. Readers describe it as fast, addictive, and genuinely spicy, the most common "couldn\'t put it down" rec in the threads.' , isbn: '9781649374042' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'If the fae-court-politics part of FBAA is what you loved, readers say go here next. It\'s YA so the spice is basically nonexistent, but the scheming and the enemies-to-lovers tension are unmatched. Jude is a mortal girl clawing for power in a court that despises her, and Cardan is the blueprint for the hateable-then-devastating love interest. The trilogy is tight and the consensus is the payoff in book 2 is worth it.' , isbn: '9781955876162' },
      { title: 'The Bridge Kingdom', author: 'Danielle L. Jensen', why: 'The pick readers reach for when they want the exact falling-for-the-enemy itch FBAA scratches. Lara was trained from childhood to destroy the kingdom she\'s now married into as a spy, and then she starts realizing everything she was told was a lie. Readers say the betrayal-and-loyalty whiplash hits just like the Poppy/Hawke reveals do. Underrated, and the spice lands around 3.5-4.' , isbn: '9781734506204' },
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'The go-to rec when someone in r/Romantasy wants to go darker after FBAA. Vampire romantasy, a human adopted daughter of the Nightborn king enters a deadly trial where contestants kill each other, and readers single out the slow burn with her rival Raihn as the highlight. Described as gorgeous, brutal, and atmospheric. If you liked the deadly-world-high-stakes side of FBAA, the threads say this delivers.' , isbn: '9781728295336' },
      { title: 'Quicksilver', author: 'Callie Hart', why: 'The book readers keep recommending to fill the wait between FBAA installments. Saeris is a thief who accidentally opens a portal and gets yanked into a frozen fae world bound to Kingfisher, a deadly, grumpy, centuries-old warrior who is exactly the type FBAA fans fall for. 700 pages, a slow burn readers call masterclass-level, and spice that builds and then detonates. The 2024 breakout the threads wouldn\'t shut up about, and the consensus is the hype was earned.' , isbn: '9781538774199' },
    ],
    faqs: [
      { q: 'Should I read FBAA or ACOTAR first?', a: 'Reddit is split. The honest answer: read ACOTAR first if you\'re new to romantasy, the world-building is gentler and book 2 (A Court of Mist and Fury) is the book that converted thousands of readers to the genre. Read FBAA first if you want spicier from page one and don\'t mind a denser opening chapter. Most readers do both; the question is order.' },
      { q: 'What\'s the reading order for the Blood and Ash series?', a: 'Main series in order: From Blood and Ash, A Kingdom of Flesh and Fire, The Crown of Gilded Bones, The War of Two Queens, A Soul of Ash and Blood, A Fire in the Flesh. The Flesh and Fire prequel series (A Shadow in the Ember, A Light in the Flame) is set earlier and can be read before or after the main series, most r/RomanceBooks readers say read the main series first, then go back for the prequels.' },
      { q: 'How many books are in the Blood and Ash series?', a: 'Six books in the main series as of 2025, plus the Flesh and Fire prequel series. The main story concludes in A Fire in the Flesh (book 6). JLA also writes the connected Crown of Ash spinoff. Total franchise so far: 10+ books across three series in the same world.' },
      { q: 'Is From Blood and Ash spicy?', a: 'Very. On most reader spice scales it sits at 4-5 out of 5, explicit scenes, multiple occurrences, anatomically specific. Significantly spicier than ACOTAR book 1. Most Reddit readers describe the spice level as core to the appeal, not a bonus. Not for sweet-romance readers.' },
      { q: 'What\'s the twist in From Blood and Ash?', a: 'We don\'t spoil it here, but it completely reframes Hawke\'s identity and motivations. Reddit considers it one of the better-executed reveals in modern romantasy. Going in blind makes it land harder. Don\'t look it up.' },
    ],
  },

  'the-cruel-prince': {
    sourceTitle: 'The Cruel Prince',
    sourceAuthor: 'Holly Black',
    sourceAbout: "Ask r/Romantasy or r/YAlit who wrote the fae enemies-to-lovers blueprint and the answer is Holly Black. Jude is a mortal girl raised in the faerie courts, refusing to be prey in a world that wants her dead, and Prince Cardan, who despises her, becomes the rivalry the whole genre is still copying. It's YA so the spice is basically nonexistent, but readers say the scheming, the political knife-work, and the slow-burn loathing more than make up for it. The other thing the threads stress: don't stop at book 1, book 2 (The Wicked King) is where Cardan becomes the character people obsess over. A tight, complete trilogy, which readers love.",
    recs: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Feyre Archeron, a mortal huntress, is dragged into the enchanted fae lands after killing a wolf, and pulled into a world of dangerous courts, dark magic, and a love that will unmake and remake her. The adult version of what Cruel Prince built, with full romance and explicit scenes. Mentioned in 11 of 20 books-like-Cruel-Prince threads on Reddit.' , isbn: '9781635575569' },
      { title: 'An Ember in the Ashes', author: 'Sabaa Tahir', why: 'Laia of Serra infiltrates a brutal military academy as a spy to free her brother, while a soldier named Elias questions the empire he was raised to serve. Same brutal power dynamics, same slow-burn tension across enemy lines. Mentioned in 6 of 20 Cruel Prince threads on Reddit.' , isbn: '9780008149635' },
      { title: 'The Wrath and the Dawn', author: 'Renée Ahdieh', why: 'Shahrzad volunteers to marry the Caliph of Khorasan, the king who killed her best friend and takes a new wife each morning. She plans to avenge her, and discovers the caliph hides secrets darker than his reputation. Same political scheming, same enemies-to-lovers realization wrapped in gorgeous prose.' , isbn: '9780147513854' },
      { title: 'Fourth Wing', author: 'Rebecca Yarros', why: 'Dragon-rider war academy with a morally grey love interest and a protagonist who shouldn\'t survive. Adult and explicit, but structurally the closest heir to Cruel Prince\'s energy in the current market.' , isbn: '9781649374042' },
      { title: 'The Jasad Heir', author: 'Sara Hashem', why: 'A survivor of a destroyed magical kingdom must compete in a deadly tournament while hiding her magic from the ruthless general hunting her kind. Court politics, enemies-to-lovers, and a slow burn that pays off.' , isbn: '9780316477864' },
      { title: 'Daughter of the Moon Goddess', author: 'Sue Lynn Tan', why: 'Xingyin grows up hiding on the moon, her mother imprisoned by the Emperor of the Immortal Realm, and must enter the Celestial Kingdom disguised to earn her mother\'s freedom. Lush prose, Chinese mythology, and a slow-burn romance with a morally complex love interest.' , isbn: '9780063031302' },
    ],
    faqs: [
      { q: 'Is The Cruel Prince appropriate for younger readers?', a: 'It\'s YA, violence is present (torture, death, manipulation) but the romance is not explicit. Most Reddit parents put age appropriateness at 14+. The themes of power, manipulation, and consent are handled with more nuance than most adult romantasy.' },
      { q: 'Do I need to read all three books?', a: 'Yes, the trilogy (The Cruel Prince, The Wicked King, The Queen of Nothing) is one complete arc and should be read in order. Don\'t stop at book 1. Book 2 is where Cardan becomes the character readers obsess over.' },
      { q: 'What\'s Holly Black\'s best standalone?', a: 'The Book of Night (2022) is her adult debut, a dark fantasy about a woman who can steal shadows, set in a world where shadows do magic. Book of Day is the companion novella. Both are excellent entry points for older readers.' },
    ],
  },

  'six-of-crows': {
    sourceTitle: 'Six of Crows',
    sourceAuthor: 'Leigh Bardugo',
    sourceAbout: "Six of Crows is the book r/Fantasy holds up as proof YA can out-write most adult fantasy. Kaz Brekker, a teenage criminal mastermind, pulls together a crew of six morally grey misfits for an impossible heist, breaking into the world's most secure prison. Readers fall for the characters more than the plot: Kaz and Inej, Nina and Matthias, Wylan and Jesper, an ensemble fantasy has been trying to recreate ever since. There's almost no spice (it's YA), the romance lives entirely in the tension and the longing, and readers insist the glove scene hits harder than most explicit scenes anywhere. The threads are unanimous on one thing: don't stop at book 1, because Crooked Kingdom is where the payoff lives.",
    recs: [
      { title: 'The Lies of Locke Lamora', author: 'Scott Lynch', why: 'The adult heist-fantasy blueprint Six of Crows built on. A con artist and his crew operate in a Venice-inspired city of gangsters. Mentioned in 7 of 20 books-like-Six-of-Crows threads on Reddit. Darker and denser than SoC.' , isbn: '9780553902716' },
      { title: 'Mistborn', author: 'Brandon Sanderson', why: 'In a world where ash falls from the sky and mist dominates the nights, a street thief with extraordinary powers joins a ragtag crew planning to overthrow an immortal god-king. Same ensemble-heist structure with Sanderson\'s trademark intricate magic system. The most-recommended adult fantasy crossover for SoC readers.' , isbn: '9780765311788' },
      { title: 'Nevernight', author: 'Jay Kristoff', why: 'Mia Corvere, who survived the execution of her family, trains at the Red Church, a legendary school for assassins, to gain the power she needs for revenge. Dark academia, morally grey protagonist, found family under brutal conditions. Adult, very explicit in violence. The SoC readers who want darker go here.' , isbn: '9780008179991' },
      { title: 'An Ember in the Ashes', author: 'Sabaa Tahir', why: 'Dual POV: a slave infiltrates a military academy, a soldier is assigned to watch her. Same political stakes and enemies-who-fall-for-each-other as SoC, with a Middle East-inspired world.' , isbn: '9780008149635' },
      { title: 'The Atlas Six', author: 'Olivie Blake', why: 'Six magicians, the best in the world, are recruited to compete for entry into the Alexandrian Society, a secret organization that has quietly controlled human knowledge for millennia. Only five can get in. Dark academia heist vibes, morally complex ensemble, slow-burn romantic tension across the whole cast.' , isbn: '9781250854513' },
      { title: 'A Deadly Education', author: 'Naomi Novik', why: 'A sarcastic student at a school for magicians where the magic itself wants to kill you. Witty, dark, and built around a female protagonist with the same chip-on-her-shoulder energy as Kaz.' , isbn: '9780593159668' },
    ],
    faqs: [
      { q: 'Do I need to read Shadow and Bone before Six of Crows?', a: 'No, Six of Crows is set in the same world but is completely standalone. Most readers say the books improve if you read SoC first and Shadow and Bone second. The Netflix show mixed the timelines; the books don\'t require that.' },
      { q: 'Which ships in Six of Crows are endgame?', a: 'Kaz and Inej are the slow-burn heart of the series. Wylan and Jesper are fan favorites. None of the ships are fully resolved in book 1, Crooked Kingdom (book 2) is where the payoff lives. Read both.' },
      { q: 'What\'s the spice level in Six of Crows?', a: 'Zero, it\'s YA and one of the least spicy popular fantasies. The romance is entirely in the tension, longing, and almost-touching. Reddit frequently cites the Kaz-removing-his-gloves scene as more affecting than most explicit scenes in adult romance.' },
    ],
  },

  'twisted-love': {
    sourceTitle: 'Twisted Love',
    sourceAuthor: 'Ana Huang',
    sourceAbout: "Twisted Love is the book r/RomanceBooks credits with kicking off the whole New Adult dark-romance wave on BookTok. Alex Chen, cold, controlled, her brother's best friend and her reluctant guardian, has kept Ava at arm's length for years, and his reasons are darker than she knows. Readers will tell you it's basically 'dark romance with training wheels': a morally grey, obsessively protective MMC and real tension, but nowhere near as intense as the genre gets. That's exactly why it's the recommended entry point. The friend group hooks people enough to read the whole interconnected series. Spice is solid (3-4) and the slow burn does the work.",
    recs: [
      { title: 'Haunting Adeline', author: 'H.D. Carlton', why: 'Adeline moves into her grandmother\'s Victorian mansion and discovers she\'s being watched. Her stalker isn\'t hiding, he wants her to know he\'s there, and he has no intention of stopping. The dark romance readers reach for after Twisted Love turns out not to be dark enough. Very explicit, very dark. The Twisted Love-to-Haunting Adeline pipeline is well-documented on r/DarkRomance.' , isbn: '9781957635002' },
      { title: 'Icebreaker', author: 'Hannah Grace', why: 'Ice skater shares rink time with a hockey player who is everything she should avoid. Same forbidden tension and slow-burn energy in a sports romance setting. The lighter version of what Twisted Love does.' , isbn: '9781668026038' },
      { title: 'King of Wrath', author: 'Ana Huang', why: 'Same author, same universe, same formula, which is a compliment. An arranged marriage between a billionaire and a woman with secrets. Start here if you want more of Huang\'s specific voice after Twisted Love.' , isbn: '9781728289724' },
      { title: 'The Love Hypothesis', author: 'Ali Hazelwood', why: 'Fake dating a grumpy professor in a STEM setting. Less dark than Twisted Love but same female protagonist voice and the same payoff when the love interest finally cracks.' , isbn: '9780593336823' },
      { title: 'The Risk', author: 'S.T. Abby', why: 'An FBI agent pursues revenge against the man who destroyed her family while falling for his brother. Similar morally grey characters with dark pasts, darker in execution than Twisted Love.' , isbn: '9781544658773' },
      { title: 'The Hating Game', author: 'Sally Thorne', why: 'The office enemies-to-lovers blueprint. Two executive assistants share a desk and can\'t stand each other. Less dark, more banter, the palate cleanser after Twisted Love.' , isbn: '9780063063532' },
    ],
    faqs: [
      { q: 'Is the Twisted series a series or standalones?', a: 'Interconnected standalones, each book follows a different couple from the same friend group. You can read in any order, but starting with Twisted Love (book 1) gives you context for recurring characters across the series.' },
      { q: 'Is Twisted Love dark romance?', a: 'It\'s on the lighter end, morally grey love interest, protective behaviors, some emotional manipulation. Not graphic violence. True dark romance readers sometimes find it too tame; contemporary readers sometimes find it too intense. It sits exactly at the crossover.' },
      { q: 'What\'s Ana Huang\'s best series?', a: 'The Twisted series (4 books) is her most popular. The Kings of Sin series is her second series, same contemporary billionaire romance formula with arranged marriages and enemies-to-lovers. Most readers do Twisted first, then Kings of Sin.' },
    ],
  },

  'haunting-adeline': {
    sourceTitle: 'Haunting Adeline',
    sourceAuthor: 'H.D. Carlton',
    sourceAbout: "Haunting Adeline is the book r/DarkRomance points to when someone asks what the genre actually means, and the one they warn you hardest about. Adeline inherits her grandmother's Victorian mansion and realizes she's being watched by a stalker who has no intention of hiding. It's deliberately boundary-crossing, very explicit, and built on dark-romance conventions that depict fantasy scenarios, not endorsements, readers are emphatic about checking the (long) trigger-warning list first. The community is split: some call it a compulsive obsession read, others bounce off it hard. Either way it's the genre's most-discussed title. Note from the threads: it doesn't resolve in book 1, so have Hunting Adeline ready.",
    recs: [
      { title: 'Twisted Love', author: 'Ana Huang', why: 'Alex Chen, her brother\'s best friend and temporary guardian, has spent years keeping his distance from Ava. He has his reasons, and they\'re darker than she knows. The entry point before Haunting Adeline, or the palate cleanser after. Same dark-love-interest energy at significantly lower intensity.' , isbn: '9781087939278' },
      { title: 'Corrupt', author: 'Penelope Douglas', why: 'A girl forced into a Halloween revenge game that becomes something else entirely. Douglas is the author most Haunting Adeline readers cross over to. Dark, explicit, and psychologically complex.' , isbn: '9780593642009' },
      { title: 'Credence', author: 'Penelope Douglas', why: 'Tiernan De Haas, a young woman adrift after her parents\' deaths, goes to live with her stepfather and his two sons in a remote Colorado mountain compound. The isolation makes everything complicated in ways she didn\'t expect. Same deliberately uncomfortable dynamics as Haunting Adeline. Same trigger-warning culture applies, not for every reader.' , isbn: '9781660089055' },
      { title: 'The Risk', author: 'S.T. Abby', why: 'An FBI agent pursues revenge while falling for the wrong man. Similar dark-romance energy with a plot-driven backbone that gives it more structure than purely emotion-driven dark romance.' , isbn: '9781544658773' },
      { title: 'Verity', author: 'Colleen Hoover', why: 'The psychological thriller most Haunting Adeline readers cross over to. Not dark romance, but the same "I need to know what happens even though it\'s disturbing me" reading experience.' , isbn: '9781538724736' },
      { title: 'Hunting Adeline', author: 'H.D. Carlton', why: 'Book 2 of the Cat and Mouse Duet and the direct continuation of Haunting Adeline. The story doesn\'t resolve in book 1, Hunting Adeline is where the ending lives. Read them back to back.' , isbn: '9781638932925' },
    ],
    faqs: [
      { q: 'What are the trigger warnings for Haunting Adeline?', a: 'Stalking, explicit non-consensual content (detailed), violence, manipulation, and dubious consent throughout. This book requires understanding that dark romance depicts fantasy scenarios not endorsed by the author. Check StoryGraph for the full list before starting.' },
      { q: 'Is Haunting Adeline the first book?', a: 'Yes, book 1 of the Cat and Mouse Duet. Book 2 is Hunting Adeline. The story does not fully resolve in book 1, so read both. They\'re typically sold together or back-to-back because of the cliffhanger.' },
      { q: 'Is dark romance a genre I\'ll like if I loved ACOTAR?', a: 'Only if you want much darker content. ACOTAR\'s dark elements (morally grey love interest, court politics) are very different from dark romance\'s intentional trigger content. Haunting Adeline is frequently cited as the book that defines the difference between the two genres.' },
    ],
  },

  'king-of-wrath': {
    sourceTitle: 'King of Wrath',
    sourceAuthor: 'Ana Huang',
    sourceAbout: "King of Wrath is the book r/RomanceBooks recommends when you've finished Ana Huang's Twisted series and want more of exactly that. CEO Dante Russo needs a wife to shut down a blackmailer and turns to Vivian Lau, the woman his family wanted him to marry anyway, who has zero interest in being anyone's convenient solution. Readers know the formula by now (cold powerful MMC, sharp heroine, arranged-marriage-to-real-feelings), and that predictability is the comfort-read appeal, not a knock against it. Spice is explicit (3-4). The consensus: if Huang's voice works for you, this is more of it, and the Kings of Sin ensemble is just as bingeable as Twisted.",
    recs: [
      { title: 'Twisted Love', author: 'Ana Huang', why: 'Alex Chen, her brother\'s best friend and temporary guardian, has spent years keeping his distance from Ava. He has his reasons, and they\'re darker than she knows. The book that launched the author\'s career, same friend-group universe, same formula refined. If you loved King of Wrath, start here to meet the characters who cross over.' , isbn: '9781087939278' },
      { title: 'The Hating Game', author: 'Sally Thorne', why: 'The enemies-to-lovers office romance blueprint. Two people who can\'t stand each other in close proximity, tension building until it doesn\'t. Less dark than King of Wrath but the gold standard for the trope.' , isbn: '9780063063532' },
      { title: 'Icebreaker', author: 'Hannah Grace', why: 'Sports romance with the same forced-proximity slow burn. A figure skater and a hockey player who have no business falling for each other. Same enemies-to-genuine-feelings pipeline in an athletic setting.' , isbn: '9781668026038' },
      { title: 'The Love Hypothesis', author: 'Ali Hazelwood', why: 'Fake dating, grumpy love interest, female lead who underestimates her own appeal. STEM setting, less dark, same satisfying slow-burn payoff when the love interest finally cracks.' , isbn: '9780593336823' },
      { title: 'The Bridge Kingdom', author: 'Danielle L. Jensen', why: 'Fantasy arranged marriage where she\'s been trained to destroy the man she\'s marrying. Translates King of Wrath\'s tensions, obligation vs. desire, enemy vs. something more, into epic fantasy.' , isbn: '9781734506204' },
      { title: 'A Touch of Darkness', author: 'Scarlett St. Clair', why: 'Hades and Persephone. Forced proximity, a world where she has no power, and a love interest who is made of danger. The mythology-romance version of the same arranged-pairing tropes.' , isbn: '9781949039153' },
    ],
    faqs: [
      { q: 'Do the Kings of Sin books need to be read in order?', a: 'Interconnected standalones, each follows a different couple, but reading in publication order (King of Wrath first) gives you recurring character development. Book 1 sets up the world and the ensemble that carries through the series.' },
      { q: 'Is King of Wrath spicy?', a: 'Yes, explicit scenes, 3-4 out of 5 on most reader scales. Comparable to Twisted Love. Ana Huang\'s formula includes explicit romance as a core element, not an add-on.' },
      { q: 'What\'s the difference between the Twisted and Kings of Sin series?', a: 'Twisted is set in college and early post-college. Kings of Sin is fully adult billionaire romance. Both follow the same Ana Huang formula. Most readers do Twisted first then Kings of Sin, but either order works as both series are standalones.' },
    ],
  },

  'icebreaker': {
    sourceTitle: 'Icebreaker',
    sourceAuthor: 'Hannah Grace',
    sourceAbout: "Icebreaker is the book r/RomanceBooks hands you when you say you want to try the hockey-romance thing everyone's obsessed with. Figure skater Anastasia Allen has to share ice time with the Titans hockey team and their captain, Nathan Hawkins, who's everything her rigid schedule can't accommodate. Readers love it for the cozy-but-spicy vibe, the supportive hockey-boys cast that spawned its own fandom, and a heroine who doesn't let the love interest steamroll her. Spice is genuinely high (3-4, multiple detailed scenes), this isn't kisses-and-tension. The consensus gateway into BookTok sports romance.",
    recs: [
      { title: 'Twisted Love', author: 'Ana Huang', why: 'Alex Chen, her brother\'s best friend and temporary guardian, has spent years keeping his distance from Ava. He has his reasons, and they\'re darker than she knows. The contemporary romance Icebreaker readers cross over to most. Same forbidden slow burn, same "he\'s wrong for me but I can\'t help it" energy.' , isbn: '9781087939278' },
      { title: 'The Love Hypothesis', author: 'Ali Hazelwood', why: 'Fake dating a grumpy professor. Same female protagonist voice, same awkward-girl-who-doesn\'t-see-her-own-appeal, same payoff when the grumpy love interest melts for exactly one person.' , isbn: '9780593336823' },
      { title: 'From Lukov with Love', author: 'Mariana Zapata', why: 'Figure skating romance, actually skating, with a long slow burn (Zapata is famous for them). Two rival skaters forced to partner up. The other skating-romance benchmark every Icebreaker fan eventually reads.' , isbn: '9780990429272' },
      { title: 'The Hating Game', author: 'Sally Thorne', why: 'The office enemies-to-lovers blueprint. Two people sharing a space who are forced to deal with each other. Same banter-to-feelings structure as Icebreaker, the standard-setter for the trope.' , isbn: '9780063063532' },
      { title: 'Daydream', author: 'Hannah Grace', why: 'Grace\'s follow-up set in the same Maple Hills world. Different couple, same cozy-but-spicy sports romance energy. The obvious next read after finishing Icebreaker.' , isbn: '9781668062777' },
      { title: 'Check & Mate', author: 'Ali Hazelwood', why: 'Chess prodigy pulled back into competition by a world champion who can\'t stop watching her. Same competitive-world enemies-and-tension structure in a cerebral setting.' , isbn: '9780593619919' },
    ],
    faqs: [
      { q: 'Is Icebreaker a standalone?', a: 'Technically yes, but it\'s set in the Maple Hills world with recurring characters. Hannah Grace wrote Daydream and Wildfire in the same universe, same found-family vibes, different couples. Read them in any order you like.' },
      { q: 'How spicy is Icebreaker?', a: 'Explicit, 3 to 4 out of 5 on most scales. Multiple detailed scenes. Comparable to Twisted Love or The Love Hypothesis in spice level. It\'s a full spicy sports romance, not just kisses and tension.' },
      { q: 'What\'s the best first sports romance if I\'ve never read the genre?', a: 'Icebreaker is the most-recommended entry point on r/RomanceBooks. From Lukov with Love is the consensus slow-burn masterpiece of the genre. The Hating Game is the go-to if you want enemies-to-lovers specifically with a professional setting.' },
    ],
  },

  'the-love-hypothesis': {
    sourceTitle: 'The Love Hypothesis',
    sourceAuthor: 'Ali Hazelwood',
    sourceAbout: "The Love Hypothesis is the rom-com r/RomanceBooks recommends when someone wants smart, funny, and low-stakes-cozy. Olive, a PhD candidate, fake-dates brooding professor Adam Carlsen to convince her best friend her love life is fine, and he, inexplicably, says yes. Readers come for Olive's anxious, self-deprecating narration, the voice that launched a thousand STEM rom-coms. Heads up from the threads: it started life as Star Wars Reylo fanfic, and the spice is light (one scene, basically 'fade-to-black plus one'). If you want banter and slow burn over heat, this is the consensus pick, and the book that made academic rom-com its own subgenre.",
    recs: [
      { title: 'The Spanish Love Deception', author: 'Elena Armas', why: 'Fake dating your tall, infuriating coworker to a wedding in Spain. Same slow-burn structure, same lead voice, same payoff. The most-recommended Love Hypothesis readalike on r/RomanceBooks.' , isbn: '9781668003275' },
      { title: 'Funny Story', author: 'Emily Henry', why: 'Two people dumped for each other\'s exes decide to fake-date for revenge. Same sharp contemporary voice, better emotional depth. The Love Hypothesis readers cross over to Emily Henry constantly.' , isbn: '9780593441282' },
      { title: 'Icebreaker', author: 'Hannah Grace', why: 'Sports romance with the same forced-proximity slow burn and grumpy love interest who melts for exactly one person. Less academia, same emotional payoff.' , isbn: '9781668026038' },
      { title: 'Happy Place', author: 'Emily Henry', why: 'A couple who secretly broke up months ago goes on their annual friend-group trip and has to pretend everything is fine. Same fake-relationship anxiety, deeper emotional stakes.' , isbn: '9780593638446' },
      { title: 'Check & Mate', author: 'Ali Hazelwood', why: 'Hazelwood\'s follow-up, a chess prodigy pulled back into competition by a world champion. Same voice, same female-lead self-doubt, same grumpy love interest formula. The obvious next read.' , isbn: '9780593619919' },
      { title: 'Beach Read', author: 'Emily Henry', why: 'Two writers bet they can write each other\'s genres in a summer. Henry\'s best slow burn and the obvious Henry starting point for Love Hypothesis readers making the crossover.' , isbn: '9780593336120' },
    ],
    faqs: [
      { q: 'Is The Love Hypothesis based on a real story?', a: 'It originated as a Reylo (Star Wars) fan fiction titled Bittersweet. Hazelwood rewrote it as original fiction. Knowing the origin doesn\'t change the reading experience, it\'s a complete standalone novel.' },
      { q: 'How spicy is The Love Hypothesis?', a: 'One explicit scene, readers who want the spice describe it as "fade to black plus one." Spice level 2 out of 5. The appeal is mostly the slow burn and banter rather than explicit content. Significantly less spicy than Icebreaker or Twisted Love.' },
      { q: 'What\'s Ali Hazelwood\'s best book after The Love Hypothesis?', a: 'Love on the Brain (neuroscientist, enemies-to-lovers, NASA setting) is the consensus answer on Reddit. Under One Roof and Check & Mate are her other well-reviewed follow-ups. All feature STEM protagonists and the same voice.' },
    ],
  },

  'the-summer-i-turned-pretty': {
    sourceTitle: 'The Summer I Turned Pretty',
    sourceAuthor: 'Jenny Han',
    sourceAbout: "Thanks to the Prime show, The Summer I Turned Pretty is everywhere again, and r/YAlit will warn you it's the most divisive love triangle in YA. Belly has spent every summer at Cousins Beach with the Fisher family, caught between sweet, steady Jeremiah and complicated, unreachable Conrad. Readers are split almost down the middle on the teams, which is honestly half the fun. It's nostalgic, summery coming-of-age, lighter and more bittersweet than adult romance, so set expectations accordingly. Note from the threads: the show diverges from the books significantly after season 1, so it's worth reading them as their own thing.",
    recs: [
      { title: 'To All the Boys I\'ve Loved Before', author: 'Jenny Han', why: 'Lara Jean Covey has always kept her most private feelings in unsent love letters, one for every boy she\'s ever loved. Then all five letters get mailed, and her carefully constructed life becomes spectacularly complicated. Same author, same emotional intelligence. The most-mentioned Jenny Han crossover in books-like-Summer-I-Turned-Pretty threads on Reddit.' },
      { title: 'Beach Read', author: 'Emily Henry', why: 'Two writers spend a summer next to each other making a bet that changes everything. Adult contemporary with the same slow-burn beach setting and emotional intelligence. The natural aging-up read for Summer fans.' , isbn: '9780593336120' },
      { title: 'People We Meet on Vacation', author: 'Emily Henry', why: 'Two best friends, ten summer trips, one fight that ended it all. The adult love story that captures the same "something that only exists in this one place" nostalgia as Cousins Beach.' , isbn: '9781984806758' },
      { title: 'Anna and the French Kiss', author: 'Stephanie Perkins', why: 'An American girl sent to boarding school in Paris falls for the boy who already has a girlfriend. The YA slow-burn blueprint for readers who love the will-they-won\'t-they tension of Summer.' , isbn: '9781409579939' },
      { title: 'One Day in December', author: 'Josie Silver', why: 'A woman sees the man of her dreams through a bus window, loses him, then meets him a year later, as her best friend\'s boyfriend. Same wrong-time, wrong-situation heartache the Fisher triangle runs on.' , isbn: '9780241982273' },
      { title: 'The Notebook', author: 'Nicholas Sparks', why: 'The summer-romance-with-class-barriers blueprint. Noah and Allie\'s summer love reshapes both their lives. Summer fans looking for the adult emotional devastation often land here.' , isbn: '9781568652429' },
    ],
    faqs: [
      { q: 'Is the Amazon Prime show faithful to the books?', a: 'The first season closely follows Book 1. Season 2 diverges significantly, the show changed a major character dynamic that divided book fans. Most readers recommend experiencing both separately rather than as the same story.' },
      { q: 'Team Conrad or Team Jeremiah?', a: 'Reddit is split roughly 60/40 in favor of Conrad, though Team Jeremiah has been vocal since the show\'s casting. Han has said both endings were drafted. The second book, It\'s Not Summer Without You, is where the team lines solidify.' },
      { q: 'What should I read after finishing all three Jenny Han books?', a: 'Emily Henry is the consensus adult author recommendation. People We Meet on Vacation or Beach Read for the same beach-summer emotional register. Anna and the French Kiss if you want to stay in YA.' },
    ],
  },

  'the-silent-patient': {
    sourceTitle: 'The Silent Patient',
    sourceAuthor: 'Alex Michaelides',
    sourceAbout: "The Silent Patient is the thriller r/thrillers recommends when someone wants a twist they genuinely won't see coming. Alicia, a famous painter, shoots her husband five times and then never speaks again, and a psychotherapist becomes obsessed with getting her to talk. Readers say the whole book is engineered around one reveal, and when it lands it reframes everything you just read. The crowd that saw it coming tends to be Gone Girl veterans; first-time thriller readers get hit full force. The near-universal advice in the threads: go in knowing nothing, and don't let anyone spoil the ending.",
    recs: [
      { title: 'Verity', author: 'Colleen Hoover', why: 'The most-mentioned Silent Patient readalike on r/ThrillerBooks, appears in 8 of 20 threads. A writer finds a horrifying hidden manuscript. Same unreliable narrator, same twist that rewrites everything you read before it.' , isbn: '9781538724736' },
      { title: 'Gone Girl', author: 'Gillian Flynn', why: 'On their five-year wedding anniversary, Nick Dunne\'s wife Amy goes missing. The investigation unravels a marriage of lies, performance, and mutual deception, and reveals two of the most unreliable narrators in modern fiction. The psychological thriller that created the era The Silent Patient belongs to. The genre-defining text every reader should encounter.' , isbn: '9780307588371' },
      { title: 'The Woman in the Window', author: 'A.J. Finn', why: 'An agoraphobic woman watches her neighbors through her window and witnesses something she shouldn\'t. Deliberately Hitchcock-ian, same unreliable-narrator structure as Silent Patient.' , isbn: '9780062678416' },
      { title: 'Behind Closed Doors', author: 'B.A. Paris', why: 'The perfect marriage with something deeply wrong underneath. Slower burn than Silent Patient but the same "I need to know what\'s happening in that house" compulsive reading.' , isbn: '9781474037945' },
      { title: 'The Girl on the Train', author: 'Paula Hawkins', why: 'Paula Hawkins\'s unreliable narrator sees something from the train window that pulls her into a murder investigation. Sits in the same comps trio as Gone Girl and Silent Patient.' , isbn: '9781524734107' },
      { title: 'The Housemaid', author: 'Freida McFadden', why: 'A woman with a hidden past takes a job as housemaid for a wealthy couple. McFadden\'s twist game is the closest to Michaelides\'s on the current thriller shelf.' , isbn: '9781538777930' },
    ],
    faqs: [
      { q: 'Is The Silent Patient part of a series?', a: 'No, it\'s a complete standalone. Alex Michaelides published The Maidens (2021) afterward, a different story with a different narrator but the same Oxford setting and classical literature atmosphere.' },
      { q: 'How does the twist in The Silent Patient compare to Gone Girl?', a: 'Both rewrites are complete, you see the whole story differently. Silent Patient\'s is more plot-dependent (a factual revelation). Gone Girl\'s is more character-dependent (understanding Amy differently). Most readers prefer one over the other based on whether they like plot or character twists.' },
      { q: 'What\'s the best recent thriller with a similar twist?', a: 'The Housemaid series by Freida McFadden (particularly The Coworker and The Locked Door) are the most-recommended current-era equivalents. McFadden has become the author readers turn to for the same twist-driven satisfaction.' },
    ],
  },

  'the-woman-in-cabin-10': {
    sourceTitle: 'The Woman in Cabin 10',
    sourceAuthor: 'Ruth Ware',
    sourceAbout: "The Woman in Cabin 10 is the locked-room thriller r/thrillers points to when you want claustrophobic dread on a luxury cruise. Travel journalist Lo Blacklock sees a woman thrown overboard from the cabin next to hers, except no one was ever booked in that cabin, and nobody believes her. Readers are honest that Lo is an anxious, hard-drinking, sometimes-frustrating narrator, and whether that works for you is the whole experience. The appeal is the slow-tightening 'is she right, or is she unraveling?' tension. A Netflix adaptation sent a fresh wave of readers back to it. Best read back-to-back with The Silent Patient.",
    recs: [
      { title: 'The Silent Patient', author: 'Alex Michaelides', why: 'The most-mentioned readalike in books-like-Woman-in-Cabin-10 threads. Same unreliable female narrator, same mounting dread, same twist that reframes everything. A natural back-to-back read.' , isbn: '9781250301697' },
      { title: 'Gone Girl', author: 'Gillian Flynn', why: 'On their five-year wedding anniversary, Nick Dunne\'s wife Amy goes missing. The investigation unravels a marriage of lies, performance, and mutual deception, and reveals two of the most unreliable narrators in modern fiction. The psychological thriller benchmark every Woman in Cabin 10 reader eventually reaches.' , isbn: '9780307588371' },
      { title: 'In a Dark, Dark Wood', author: 'Ruth Ware', why: 'Ware\'s debut, and the book most readers say to try if they loved Cabin 10. A hen party in a remote glass house, old secrets resurface, someone ends up dead. Same author, same locked-location dread.' , isbn: '9780099598244' },
      { title: 'The Turn of the Key', author: 'Ruth Ware', why: 'A nanny takes a job in a smart home in the Scottish Highlands. Something happens. She writes letters from prison explaining everything. Ware\'s most-recommended book after Cabin 10.' , isbn: '9781501192364' },
      { title: 'The Guest List', author: 'Lucy Foley', why: 'A glamorous island wedding with a killer among the guests. Dual timelines, ensemble cast, no way off the island. The Cabin 10 template in an Irish setting.', isbn: '9780062868930' },
      { title: 'The Hunting Party', author: 'Lucy Foley', why: 'A group of old friends, a remote Scottish estate, and a blizzard that traps them all. Same isolated-location, something-wrong-with-this-group energy.' , isbn: '9780063063587' },
    ],
    faqs: [
      { q: 'Is The Woman in Cabin 10 based on a true story?', a: 'No, it\'s entirely fictional. Ruth Ware has said the cruise setting came from a personal fear of cruise ships. The locked-cabin scenario is invented, though the claustrophobic atmosphere of luxury cruises is grounded in real observation.' },
      { q: 'What order should I read Ruth Ware\'s books?', a: 'All standalones, any order. Most readers start with In a Dark, Dark Wood (debut, fastest) or The Turn of the Key (most reviewed). Woman in Cabin 10 is the most popular entry point because of its word-of-mouth history.' },
      { q: 'Who\'s the closest author to Ruth Ware right now?', a: 'Lucy Foley (The Guest List, The Hunting Party) is the most-cited contemporary equivalent. Both specialize in location-locked thrillers with ensemble casts and unreliable narrators.' },
    ],
  },

  'a-good-girls-guide-to-murder': {
    sourceTitle: "A Good Girl's Guide to Murder",
    sourceAuthor: 'Holly Jackson',
    sourceAbout: "A Good Girl's Guide to Murder is the YA thriller r/YAlit credits with reviving the whole genre. Pip reopens a closed murder case for her senior project, everyone says Sal Singh killed Andie Bell and then himself five years ago, but Pip isn't convinced, and what starts as homework turns into real danger. Readers say the true-crime-podcast format (interview transcripts, case files, screenshots) is what hooks you in the first chapter. It's properly YA, but it gets genuinely dark by book 3, so it isn't the cozy mystery the school-project framing suggests. A complete, bingeable trilogy, the threads say read all three in order.",
    recs: [
      { title: 'One of Us Is Lying', author: 'Karen McManus', why: 'Five students go into detention, one doesn\'t come out alive. YA murder mystery with the same teenager-investigates-impossible-situation energy. Most-mentioned AGGGTM readalike on Reddit.' , isbn: '9780593565377' },
      { title: 'The Inheritance Games', author: 'Jennifer Lynn Barnes', why: 'A girl inherits a billionaire\'s estate, but only if she can solve the puzzles he left behind. Same puzzle-driven plot momentum with a mystery that keeps layering.' , isbn: '9781368052405' },
      { title: 'Truly Devious', author: 'Maureen Johnson', why: 'A true-crime-obsessed girl attends a school famous for an unsolved 1930s kidnapping, and discovers a new mystery. Same YA thriller voice, same obsessive investigator protagonist.' , isbn: '9780062338051' },
      { title: 'We Were Liars', author: 'E. Lockhart', why: 'A family reunion on a private island, a memory wiped clean, and a summer that no one will talk about. YA mystery with the same "I need to know what happened" forward momentum.' , isbn: '9781525255571' },
      { title: 'Two Can Keep a Secret', author: 'Karen McManus', why: 'Echo Ridge has a history of dead girls. Another one is missing. Same small-town secrets structure that AGGGTM runs on.' , isbn: '9781524714710' },
      { title: 'The Silent Patient', author: 'Alex Michaelides', why: 'The adult thriller AGGGTM readers graduate to. Same twist-everything reveal, same unreliable accounts, significantly darker and more complex. The natural step up.' , isbn: '9781250301697' },
    ],
    faqs: [
      { q: 'Is A Good Girl\'s Guide to Murder a series?', a: 'Yes, three books: A Good Girl\'s Guide to Murder, Good Girl Bad Blood, and As Good as Dead. The trilogy is complete and should be read in order. Books 2 and 3 have the same characters, higher stakes, and more darkness.' },
      { q: 'Is it appropriate for younger readers?', a: 'YA, recommended 14+. There\'s violence, references to drugs and sexual assault, and the stakes get genuinely dark in book 3. Not a cozy mystery despite the school-project framing.' },
      { q: 'What makes it different from other YA thrillers?', a: 'The true-crime podcast format woven into the text, transcribed interviews, screenshots, case files, makes it feel like following a real investigation. Most readers cite the format as what hooked them in the first chapter.' },
    ],
  },

  'twilight': {
    sourceTitle: 'Twilight',
    sourceAuthor: 'Stephenie Meyer',
    sourceAbout: "Twilight is the book that built an entire generation of readers, and r/books treats rereading it as its own little ritual. Bella Swan moves to rainy Forks and falls for Edward Cullen, who's beautiful, hostile, and very much not human. Readers are clear-eyed about its flaws now, but most reread it as a nostalgia comfort-read with full awareness, and Midnight Sun (Edward's POV, 2020) won over a lot of skeptics. Spice is basically zero; the appeal is the obsessive, forbidden longing. Every paranormal romance and romantasy after it owes it a debt, which is why adult readers so often graduate to ACOTAR and From Blood and Ash next.",
    recs: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'The most-mentioned Twilight readalike on Reddit, appears in 10 of 20 threads. Adult fantasy romance with the same obsessive-love energy, fae instead of vampires, and explicit romance. The natural graduation for adult Twilight readers.' , isbn: '9781635575569' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'Same forbidden-love-against-the-rules structure. A sheltered girl falls for the one person she shouldn\'t. The romantasy equivalent of the Twilight formula, significantly spicier.' , isbn: '9781952457760' },
      { title: 'Hush, Hush', author: 'Becca Fitzpatrick', why: 'A fallen angel enrolls in Nora\'s biology class and can\'t stop watching her. The YA paranormal romance that came closest to replicating Twilight\'s exact formula and atmosphere.' , isbn: '9781416989417' },
      { title: 'Shiver', author: 'Maggie Stiefvater', why: 'Grace has watched the wolves in the woods behind her house for years. One summer a yellow-eyed boy appears. Same forbidden love with a ticking clock, quieter and more literary than Twilight.' , isbn: '9781407130392' },
      { title: 'Beautiful Creatures', author: 'Kami Garcia & Margaret Stohl', why: 'A boy falls for the mysterious girl who arrives in his small southern town and discovers the supernatural world she comes from. Same normal-human-falls-for-supernatural template, told from the human male POV.' , isbn: '9780141943275' },
      { title: 'The Vampire Diaries', author: 'L.J. Smith', why: 'Predates Twilight and more morally complex. Elena Gilbert and two vampire brothers, lots of love triangle angst. Twilight readers often discover it second and find the darker edges satisfying.' , isbn: '9781615238187' },
    ],
    faqs: [
      { q: 'Is the Twilight Saga worth rereading as an adult?', a: 'Reddit is genuinely split on this. Many adult readers report enjoying it as a nostalgia read with full awareness of its flaws. The Midnight Sun (Edward\'s POV, published 2020) has surprisingly strong reviews from people who expected to hate it.' },
      { q: 'What\'s the adult version of Twilight?', a: 'From Blood and Ash and A Court of Thorns and Roses are the consensus adult equivalents, forbidden romance, obsessive love interest, chosen girl in a dangerous supernatural world. Both are significantly spicier than Twilight.' },
      { q: 'What came after Twilight in the paranormal romance genre?', a: 'Hush, Hush (fallen angels), Beautiful Creatures (witches), Shiver (werewolves), and The Mortal Instruments (shadowhunters) were the direct genre successors in YA. In adult fiction, the vampire romance genre moved toward the explicit romance of Kresley Cole and Lynsay Sands.' },
    ],
  },

  'the-housemaid': {
    sourceTitle: 'The Housemaid',
    sourceAuthor: 'Freida McFadden',
    sourceAbout: "The Housemaid is the thriller r/thrillers and BookTok recommend when you want fast, twisty, and impossible to put down. Millie, with a past she won't explain, takes a job cleaning house for the wealthy Winchesters, Nina seems fragile, Andrew seems too helpful, and there are locks Millie doesn't have keys for. Readers tear through it in a day; McFadden's whole thing is the structural mid-book twist that flips who the victim actually is. The honest caveat from the threads: Gone Girl veterans may see the mechanics coming, and the prose is plain. But as a propulsive 'I have to know what happens' read, it's the current go-to.",
    recs: [
      { title: 'The Silent Patient', author: 'Alex Michaelides', why: 'The psychological thriller most Housemaid readers reach for next. Same twist-dependent structure, same unreliable narrative that rewrites everything before it. Appears in 9 of 20 books-like-Housemaid threads on Reddit.' , isbn: '9781250301697' },
      { title: 'Verity', author: 'Colleen Hoover', why: 'A hidden manuscript, an unreliable account of murders. Same "I found something I wasn\'t supposed to find" momentum. The CoHo thriller readers cross over to from Housemaid.' , isbn: '9781538724736' },
      { title: 'Gone Girl', author: 'Gillian Flynn', why: 'On their five-year wedding anniversary, Nick Dunne\'s wife Amy goes missing. The investigation unravels a marriage of lies, performance, and mutual deception, and reveals two of the most unreliable narrators in modern fiction. The blueprint for modern psychological thrillers. Understanding Gone Girl is understanding the genre McFadden writes in.' , isbn: '9780307588371' },
      { title: 'Behind Closed Doors', author: 'B.A. Paris', why: 'The perfect marriage with something deeply wrong underneath. Jack and Grace\'s relationship hides a horror the reader discovers gradually. Same domestic-thriller claustrophobia as Housemaid.' , isbn: '9781474037945' },
      { title: 'The Nanny', author: 'Gilly Macmillan', why: 'A woman comes home to find her nanny gone and her daughter remembering a story from thirty years ago. Dual-timeline domestic thriller with the same "who is actually who" paranoia.' , isbn: '9781780899848' },
      { title: 'The Woman in the Window', author: 'A.J. Finn', why: 'An agoraphobic woman witnesses something through her window. Unreliable narrator, domestic setting, same compulsive "I need to know what\'s real" quality.' , isbn: '9780062678416' },
    ],
    faqs: [
      { q: 'Is The Housemaid a series?', a: 'Yes, The Housemaid\'s Secret is book 2, The Housemaid Is Watching is book 3. Each follows Millie in a new situation. You can technically read each as a standalone, but reading in order gives you full context for Millie\'s character arc.' },
      { q: 'How does the Housemaid twist compare to other thrillers?', a: 'It\'s a structural twist, the reveal changes who the victim actually is. Readers who\'ve read Gone Girl will see the mechanics coming. First-time psychological thriller readers tend to experience it fully. Worth reading before you get spoiled.' },
      { q: 'What\'s Freida McFadden\'s best standalone?', a: 'The Locked Door (2022) is the most-reviewed alternative, a surgeon with a traumatic past starting over in a new city. The Coworker (2023) is her other highly-rated standalone. Most Reddit readers say her standalone writing is stronger than the Housemaid sequels.' },
    ],
  },

  'happy-place': {
    sourceTitle: 'Happy Place',
    sourceAuthor: 'Emily Henry',
    sourceAbout: "Happy Place is the Emily Henry book r/RomanceBooks reaches for when they want to be in their feelings. Harriet and Wyn secretly broke up months ago but haven't told their tight-knit friend group, so when the annual Maine cottage trip happens anyway, they fake being together for one more week. Readers warn this is her most emotional: it's a relationship being mourned in real time, and people genuinely cry. It ends hopefully, but the middle is real grief, so it's not the cozy starting point. The consensus is that it's her most re-readable, carried by the best ensemble cast she's written.",
    recs: [
      { title: 'Funny Story', author: 'Emily Henry', why: 'Henry\'s 2024 follow-up and the natural next read. Same emotional intelligence, sharper dialogue, different setup. If you loved the found-family warmth of Happy Place\'s friend group, Funny Story delivers it again.' , isbn: '9780593441282' },
      { title: 'Beach Read', author: 'Emily Henry', why: 'Her breakout, and still many readers\' favorite. Two writers, a summer, a bet. The Henry slow burn that most fans say to start with before reading Happy Place.' , isbn: '9780593336120' },
      { title: 'People We Meet on Vacation', author: 'Emily Henry', why: 'Friends-to-lovers across ten summer trips. Same "this relationship has history and weight" emotional register. Netflix film adaptation January 2026.' , isbn: '9781984806758' },
      { title: 'The Hating Game', author: 'Sally Thorne', why: 'The enemies-to-lovers office romance readers cross over to most after Emily Henry. Same banter, same slow burn that cracks open perfectly.' , isbn: '9780063063532' },
      { title: 'One Day in December', author: 'Josie Silver', why: 'A woman loses the man she saw through a bus window, then meets him as her best friend\'s boyfriend. Same wrong-timing devastation with the same hopeful register.' , isbn: '9780241982273' },
      { title: 'The Friend Zone', author: 'Abby Jimenez', why: 'Friends who can\'t be together for reasons they haven\'t told each other yet. Same found-family setting, more humor, same emotional payoff.' , isbn: '9781549183362' },
    ],
    faqs: [
      { q: 'What order should I read Emily Henry\'s books?', a: 'All standalones, any order. Most Reddit readers suggest Beach Read first (best slow burn), then People We Meet on Vacation (best emotional reach), then Happy Place or Funny Story. Book Lovers can go anywhere in the sequence.' },
      { q: 'Is Happy Place sad?', a: 'It\'s the Henry book most readers cry at. The relationship grief is real and present. It ends hopefully, but the middle takes you through genuine mourning. Not the Emily Henry book to start with if you want cozy and light.' },
      { q: 'What\'s Emily Henry\'s book for readers who don\'t usually like romance?', a: 'Book Lovers and Beach Read are the most recommended entry points for skeptics. Both have strong literary and meta elements that appeal to fiction-first readers who don\'t typically read romance.' },
    ],
  },

  'book-lovers': {
    sourceTitle: 'Book Lovers',
    sourceAuthor: 'Emily Henry',
    sourceAbout: "Book Lovers is the Emily Henry book r/RomanceBooks recommends to people who think they don't like romance. Nora is a sharp, career-driven literary agent, exactly the kind of cold city woman who gets dumped in chapter one of small-town love stories, and on a forced sister-bonding trip she keeps colliding with Charlie, an editor she's sparred with for years. Readers love how meta and self-aware it is about the tropes it's playing with; it rewards anyone who actually reads the genre. Spice is moderate (2-3); the draw is the wit and the unusually grown-up leads. A common pick for fiction-first readers dipping a toe into romance.",
    recs: [
      { title: 'Happy Place', author: 'Emily Henry', why: 'Henry\'s 2023 follow-up. A couple pretending they didn\'t break up months ago at their annual friend group trip. Same voice, same ensemble warmth, more emotional devastation.' , isbn: '9780593638446' },
      { title: 'Funny Story', author: 'Emily Henry', why: 'Henry\'s 2024 book. The sharpest dialogue she\'s written, the most unconventional setup. Two people whose exes are now dating each other fake-date for revenge.' , isbn: '9780593441282' },
      { title: 'The Hating Game', author: 'Sally Thorne', why: 'The office enemies-to-lovers blueprint. Two executive assistants, shared office, escalating tension. The book Henry readers cross over to most.' , isbn: '9780063063532' },
      { title: 'Bookish and the Beast', author: 'Ashley Poston', why: 'A girl from a small town discovers a famous reclusive actor living nearby. Meta about romance tropes in the same way Book Lovers is meta about small-town romance, self-aware in a way that rewards genre readers.' , isbn: '9781094124889' },
      { title: 'People We Meet on Vacation', author: 'Emily Henry', why: 'Two best friends, ten summer trips, one fight that ended it all. The Henry book most readers rank #1. The friends-to-lovers angst that Book Lovers plays against.' , isbn: '9781984806758' },
      { title: 'One Day in December', author: 'Josie Silver', why: 'A woman sees the man of her dreams and meets him again as her best friend\'s boyfriend. Same wrong-situation, can\'t-stop-thinking-about-him premise in a London setting.' , isbn: '9780241982273' },
    ],
    faqs: [
      { q: 'Is Book Lovers or Beach Read a better first Emily Henry book?', a: 'Beach Read for the slow burn. Book Lovers for the wit. r/RomanceBooks debates this constantly. Most recommend Beach Read first because Henry\'s formula is more transparent in it, which makes Book Lovers\' playfulness land better once you\'ve seen the template.' },
      { q: 'Does Book Lovers require romance genre knowledge?', a: 'No, Henry explains the tropes she\'s riffing on inside the text. But readers who do know the genre report an extra layer of enjoyment. It\'s written to work for both genre newcomers and long-time romance readers.' },
      { q: 'Is Book Lovers spicy?', a: 'Spice level 2-3. Explicit scenes, but the book\'s appeal is primarily the intellectual and emotional tension. Less steamy than People We Meet on Vacation, more witty.' },
    ],
  },

  'the-invisible-life-of-addie-larue': {
    sourceTitle: 'The Invisible Life of Addie LaRue',
    sourceAuthor: 'V.E. Schwab',
    sourceAbout: "Addie LaRue is the book r/Fantasy and r/books recommend when someone wants something atmospheric and a little melancholy. In 1714 France, Adeline makes a desperate deal with a dark god to live forever, and the curse is that no one she meets will remember her. For 300 years she leaves no mark on anyone, until a young man named Henry, in a bookshop, says 'I remember you.' Readers are split on the ending: it's emotionally earned but light on plot resolution, and going in knowing it's a character-and-mood novel rather than a plot novel saves a lot of disappointment. Lush, lonely, and beautifully written, a slow-burn literary fantasy, not an action one.",
    recs: [
      { title: 'The Midnight Library', author: 'Matt Haig', why: 'The most-mentioned Addie LaRue readalike in Reddit threads, 6 of 20. Both ask the same question: what does a life mean? Different mechanisms (library vs. immortality curse), same emotional weight.' , isbn: '9780525559474' },
      { title: 'The Night Circus', author: 'Erin Morgenstern', why: 'Two magicians bound by a competition they didn\'t choose fall in love inside a black-and-white circus that exists outside normal time. The atmospheric fantasy most closely aligned with Addie LaRue\'s prose and feeling.' , isbn: '9780307947857' },
      { title: 'The Starless Sea', author: 'Erin Morgenstern', why: 'A graduate student finds a book containing a story about his own life and follows it underground to a hidden library city. Same lush prose, same sense of time and story as living fabric.' , isbn: '9781910701454' },
      { title: 'Circe', author: 'Madeline Miller', why: 'Circe, daughter of the sun god Helios, discovers her gift as a witch, and spends centuries navigating gods, monsters, and mortals in a world that would prefer she didn\'t exist. Same woman-across-time epic structure as Addie LaRue, same luminous prose, same sense of a life accumulating meaning against a mythological backdrop.' , isbn: '9780316556347' },
      { title: 'Strange the Dreamer', author: 'Laini Taylor', why: 'Lazlo Strange, a dreamer of a librarian obsessed with a mythical lost city, gets his impossible chance when a band of godkiller warriors shows up looking for someone exactly like him. Lush fairy-tale prose, mythology invented whole-cloth, a love story between two people from impossible worlds.' , isbn: '9781444788969' },
      { title: 'All the Light We Cannot See', author: 'Anthony Doerr', why: 'A blind French girl and a German boy during WWII, told in braided timelines. Same sweeping-through-history emotional register and luminous sentence-level writing.' , isbn: '9780606362849' },
    ],
    faqs: [
      { q: 'Is the ending of Addie LaRue satisfying?', a: 'Reddit is split. Most readers find it emotionally earned but low on plot resolution. Schwab wrote it as an ending about meaning rather than victory. Going in knowing it\'s a character novel rather than a plot novel helps.' },
      { q: 'Is V.E. Schwab better known for this or the Shades of Magic series?', a: 'Different audiences. The Shades of Magic trilogy is her most-recommended fantasy for plot-driven readers. Addie LaRue is her most-recommended for literary-leaning readers. The Villains duet (Vicious/Vengeful) is her darkest work.' },
      { q: 'Is there a sequel to Addie LaRue?', a: 'No announced sequel as of 2025. Schwab has said Addie\'s story is complete. The ending is written to work as a standalone. Most readers feel adding a sequel would undermine what the ending does.' },
    ],
  },

  'eleanor-oliphant-is-completely-fine': {
    sourceTitle: 'Eleanor Oliphant Is Completely Fine',
    sourceAuthor: 'Gail Honeyman',
    sourceAbout: "Eleanor Oliphant is the book r/books and r/suggestmeabook recommend when someone wants funny, tender, and quietly devastating all at once. Eleanor lives a rigidly ordered life, same lunch, same Friday pizza, weekly call with Mummy, and insists she's completely fine, until a scruffy new coworker named Raymond cracks her routine open. Readers say the humor pulls you in before the backstory gradually reveals what 'fine' has been covering (content warnings for childhood abuse). The title is ironic from page one, and watching the gap between what Eleanor says and what's true is the whole novel. A warm, hopeful read despite the darkness underneath.",
    recs: [
      { title: 'A Man Called Ove', author: 'Fredrik Backman', why: 'A grumpy, solitary man is disrupted when new neighbors move in. Same isolated-character-slowly-opened-up-by-unexpected-connection structure. The consensus most-mentioned Eleanor readalike on Reddit.', isbn: '9781476738024' },
      { title: 'The Midnight Library', author: 'Matt Haig', why: 'Same theme of a life that doesn\'t feel worth living until it does. More philosophical, less character-driven. Mentioned in 5 of 20 books-like-Eleanor-Oliphant threads on Reddit.' , isbn: '9780525559474' },
      { title: 'Anxious People', author: 'Fredrik Backman', why: 'A failed bank robber accidentally takes a group of apartment viewers hostage. Backman\'s darkest comedy, same unexpected-found-family-reveals-everyone\'s-damage structure.' , isbn: '9780718186616' },
      { title: 'Remarkable Bright Creatures', author: 'Shelby Van Pelt', why: 'A widow working at an aquarium befriends a giant Pacific octopus. Warm, funny, grieving quietly. Same ordinary-life-more-interesting-than-it-appears feeling as Eleanor.' , isbn: '9780063242401' },
      { title: 'Normal People', author: 'Sally Rooney', why: 'Connell and Marianne orbit each other from school to university. Rooney\'s prose has the same precision as Honeyman\'s in depicting the inner lives most people don\'t show anyone.' , isbn: '9780571334650' },
      { title: 'The Rosie Project', author: 'Graeme Simsion', why: 'A genetics professor with extreme social rigidity tries to find a wife using a scientifically designed questionnaire. Comic, tender, and kind to its neurodivergent protagonist in the way Eleanor Oliphant is.' , isbn: '9781476767901' },
    ],
    faqs: [
      { q: 'What is the dark backstory in Eleanor Oliphant?', a: 'We don\'t spoil it here. The book reveals it gradually across the second half. Trigger warnings include child abuse, neglect, and burns/fire. The revelation recontextualizes everything that came before it.' },
      { q: 'Is Eleanor Oliphant actually fine?', a: 'That\'s the whole novel. Honeyman has said the title is intentionally ironic from page one, Eleanor\'s phrase is a defense mechanism, not a statement of fact. The gap between what she says and what\'s true is what the book is about.' },
      { q: 'Is there a sequel or film adaptation?', a: 'No sequel, Honeyman has said Eleanor\'s story is complete. A film adaptation was announced with Reese Witherspoon producing and reportedly starring. As of 2025 the production timeline is unconfirmed.' },
    ],
  },

  'the-risk': {
    sourceTitle: 'The Risk',
    sourceAuthor: 'S.T. Abby',
    sourceAbout: "The Risk is the dark romance r/DarkRomance recommends to readers who normally bounce off the genre, because it has an actual thriller plot holding it up. Lana has spent years becoming a weapon: she's getting close to the man who destroyed her family, and she's falling for Logan, the brother of her target, while lying to him every single day. Readers like that the darkness serves a revenge plot rather than existing for shock value, so it's less graphic than something like Haunting Adeline. The trade-off is that you're reading for the plot as much as the romance. A self-pub word-of-mouth hit, and the go-to 'dark romance with structure' rec.",
    recs: [
      { title: 'Haunting Adeline', author: 'H.D. Carlton', why: 'The dark romance touchstone. Where The Risk has a plot-driven framework, Haunting Adeline is purely escalating obsession. For Risk readers who want to go darker and more explicit.' , isbn: '9781957635002' },
      { title: 'Twisted Love', author: 'Ana Huang', why: 'A guardian falls for his best friend\'s sister while hiding his own dark secrets. The contemporary dark romance most Risk readers read alongside or before. Less dark, same forbidden-love momentum.' , isbn: '9781087939278' },
      { title: 'Corrupt', author: 'Penelope Douglas', why: 'Halloween, old grudges, and a revenge game that becomes something else entirely. Douglas is the author Risk readers cross over to most, darker psychological territory, same compulsive pacing.' , isbn: '9780593642009' },
      { title: 'The Sweetest Oblivion', author: 'Danielle Lori', why: 'A mafia romance where Elena Vitale navigates a dangerous engagement in a world where women have no power. The organized-crime thriller version of The Risk\'s forbidden-love-with-stakes structure.', isbn: '9781721917693' },
      { title: 'Icebreaker', author: 'Hannah Grace', why: 'Sports romance with the same forbidden slow-burn energy at a much lighter register. The Risk readers who want the next read without heavy trigger warnings typically land here.' , isbn: '9781668026038' },
      { title: 'King of Wrath', author: 'Ana Huang', why: 'Arranged marriage, billionaire with dark secrets, a woman with her own agenda. The Risk\'s DNA in a contemporary-billionaire setting without the thriller framework.' , isbn: '9781728289724' },
    ],
    faqs: [
      { q: 'Is The Risk a standalone?', a: 'It\'s part of the Lana & Logan series, but book 1 resolves the central conflict. Books 2-3 (The Chase, The Fall) continue the story. Most readers feel book 1 is the strongest and works well alone.' },
      { q: 'What are the trigger warnings for The Risk?', a: 'Death of family members (detailed), revenge violence, manipulation, and morally grey behavior framed as romantic. Less graphic than Haunting Adeline, more thriller-adjacent. Check StoryGraph for the full list before starting.' },
      { q: 'Is S.T. Abby one author?', a: 'Yes, it\'s a pen name for a single author who keeps a low public profile. The Lana & Logan series was self-published and gained traction entirely through reader word-of-mouth on BookTok and Reddit without traditional marketing.' },
    ],
  },

  'mile-high': {
    sourceTitle: 'Mile High',
    sourceAuthor: 'Rebecca Yarros',
    sourceAbout: "Mile High is the book r/RomanceBooks brings up when people realize Rebecca Yarros was writing the Fourth Wing romance DNA years before the dragons showed up. Ember is trying to rebuild her life when Jagger Bateman, her brother's teammate and the man she's tried to forget, becomes impossible to avoid. Readers point to the same hallmarks: a morally grey love interest, forbidden history, and a slow burn that makes you put the book down just to breathe. It's extreme-sports contemporary, not fantasy, but the chemistry is exactly what Yarros fans chase. The natural pick for Fourth Wing readers who want her contemporary work.",
    recs: [
      { title: 'Fourth Wing', author: 'Rebecca Yarros', why: 'The book Yarros wrote five years later that broke the world. Same author voice, same morally grey love interest chemistry, now with a dragon-rider war academy. If you loved Jagger, Xaden is the next level.' , isbn: '9781649374042' },
      { title: 'Twisted Love', author: 'Ana Huang', why: 'Best friend\'s sister, forbidden history, a love interest with dark secrets. Same contemporary forbidden romance structure with the same slow-burn momentum. The most-mentioned Mile High readalike outside Yarros\'s catalog.' , isbn: '9781087939278' },
      { title: 'Icebreaker', author: 'Hannah Grace', why: 'Sports romance with a figure skater and hockey player forced to share ice time. Same athletic-world forbidden tension in a college setting.' , isbn: '9781668026038' },
      { title: 'From Lukov with Love', author: 'Mariana Zapata', why: 'Figure skating rivals forced to partner up. Zapata\'s slow burn is legendary, the pacing is the longest in sports romance. For Mile High readers who want maximum tension before the payoff.' , isbn: '9780990429272' },
      { title: 'The Hating Game', author: 'Sally Thorne', why: 'The enemies-to-lovers benchmark for contemporary romance. Less sports, same banter, same slow burn that cracks open perfectly.' , isbn: '9780063063532' },
      { title: 'Full Measures', author: 'Rebecca Yarros', why: 'Book 1 of the Renegades series and where the world Mile High lives in is established. Yarros\'s debut novel, same voice, same emotional weight.' , isbn: '9781713549017' },
    ],
    faqs: [
      { q: 'Do I need to read the Renegades books in order?', a: 'Book 1 (Full Measures) sets up the world, but Mile High reads well without it. The series follows different couples from the same extreme sports community. Most Yarros fans start with Mile High and go back.' },
      { q: 'How does Mile High compare to Fourth Wing?', a: 'Same author DNA, same slow burn, same morally grey love interest, same chemistry. Mile High is contemporary romance, Fourth Wing is fantasy. Fourth Wing is longer and more plot-dense. Most readers say the chemistry in Mile High is comparable.' },
      { q: 'Is Rebecca Yarros writing more Renegades books?', a: 'The series has 3 books (Full Measures, Into the Fire, Mile High). Yarros is currently focused on the Empyrean series (Fourth Wing, Iron Flame, Onyx Storm). A Renegades return hasn\'t been announced as of 2025.' },
    ],
  },

  'heartless-hunter': {
    sourceTitle: 'Heartless Hunter',
    sourceAuthor: 'Kristen Ciccarelli',
    sourceAbout: "Heartless Hunter is the book r/Romantasy pairs with One Dark Window as the two best gothic romantasy debuts going. Rune is a socialite secretly smuggling witches to safety in a glamorous Roaring Twenties–style world; Gideon is the witch-hunter sworn to catch her. Their whole attraction is built on mutual deception, which readers love for the hunter-and-hunted tension. Spice is low (1-2), the draw is the art-deco gothic atmosphere and the enemies-across-magical-lines dynamic, not heat. And the threads always flag the good news: it's a duology, so the story actually wraps without a years-long wait.",
    recs: [
      { title: 'One Dark Window', author: 'Rachel Gillig', why: 'The gothic romantasy most Heartless Hunter readers already love. A cursed kingdom, a masked love interest, and the same enemies-across-magical-lines tension. The pair are the two best gothic romantasy debuts of recent years.' , isbn: '9780316312691' },
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Feyre Archeron, a mortal huntress, is dragged into the enchanted fae lands after killing a wolf, and pulled into a world of dangerous courts, dark magic, and a love that will unmake and remake her. The romantasy foundation. Heartless Hunter readers who want more world-building depth land here next.' , isbn: '9781635575569' },
      { title: 'Strange the Dreamer', author: 'Laini Taylor', why: 'Lazlo Strange, a dreamer of a librarian obsessed with a mythical lost city, gets his impossible chance when a band of godkiller warriors shows up looking for someone exactly like him. The lush, fairy-tale prose Ciccarelli builds on, same sense of a love story built between two people from impossible worlds.' , isbn: '9781444788969' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'The fae enemies-to-lovers blueprint. A mortal girl in the faerie court who refuses to be a victim. Heartless Hunter\'s hunter-and-hunted-fall-for-each-other structure traces back to Cardan and Jude.' , isbn: '9781955876162' },
      { title: 'The Invisible Life of Addie LaRue', author: 'V.E. Schwab', why: 'A woman cursed to be forgotten across centuries. Same literary-fantasy register, same lush prose, same dark romantic current running under everything. The crossover for Heartless Hunter readers who want something more literary.' , isbn: '9780765387561' },
      { title: 'The Bridge Kingdom', author: 'Danielle L. Jensen', why: 'Arranged marriage where she\'s been trained to spy on her husband. Same "I\'m supposed to destroy you" enemies-to-lovers with real political stakes.' , isbn: '9781734506204' },
    ],
    faqs: [
      { q: 'Is Heartless Hunter a standalone?', a: 'No, it\'s book 1 of the Crimson Moth series. Book 2 (The Scarlet Alchemist) is out. The series is planned as a duology. Read book 1 before book 2, the story doesn\'t work out of order.' },
      { q: 'How dark is Heartless Hunter?', a: 'Atmospherically dark (witch trials, executions, gothic dread) rather than explicit-romance dark. Spice level is low, 1 to 2 out of 5. The darkness is in the political horror and moral ambiguity, not the romance. Comparable to One Dark Window.' },
      { q: 'What should I read after the Crimson Moth duology?', a: 'One Dark Window and Two Twisted Crowns (Rachel Gillig\'s complete duology) are the first recommendation, same gothic atmosphere, same complete ending. Strange the Dreamer by Laini Taylor is the literary step up from here.' },
    ],
  },

  'the-jasad-heir': {
    sourceTitle: 'The Jasad Heir',
    sourceAuthor: 'Sara Hashem',
    sourceAbout: "The Jasad Heir is the romantasy r/Romantasy recommends when readers want richer worldbuilding and an Arab-inspired setting. Sylvia is the hidden last heir of a kingdom the empire wiped out, suppressing magic that could get her killed, until she's forced to compete in the deadly Alcalah alongside Arin, the ruthless general who's spent his life hunting her kind. Readers love the enemies-to-lovers tension and the way the magic system (hereditary, tied to emotion) reveals itself gradually instead of dumping rules up front. The banter between Sylvia and Arin is the part the threads quote most. A standout debut for readers who want depth with their slow burn.",
    recs: [
      { title: 'An Ember in the Ashes', author: 'Sabaa Tahir', why: 'The Arab-inspired fantasy Jasad Heir builds on. A slave infiltrates a military academy while a soldier questions his orders. Same enemies-who-shouldn\'t-fall-for-each-other dynamic with similar cultural texture.' , isbn: '9780008149635' },
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Feyre Archeron, a mortal huntress, is dragged into the enchanted fae lands after killing a wolf, and pulled into a world of dangerous courts, dark magic, and a love that will unmake and remake her. The romantasy standard. Mentioned in 7 of 20 books-like-Jasad-Heir threads on Reddit.' , isbn: '9781635575569' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'Fae enemies-to-lovers. A girl in a court that wants to destroy her schemes her way to power. The template Jasad Heir\'s political maneuvering and slow-burn rivalry run on.' , isbn: '9781955876162' },
      { title: 'Daughter of the Moon Goddess', author: 'Sue Lynn Tan', why: 'Xingyin grows up hiding on the moon, her mother imprisoned by the Emperor of the Immortal Realm, and must enter the Celestial Kingdom disguised to earn her mother\'s freedom. Same hiding-your-true-power-while-surviving-in-a-dangerous-court stakes, with rich East Asian mythology.' , isbn: '9780063031302' },
      { title: 'The Bridge Kingdom', author: 'Danielle L. Jensen', why: 'A spy marries an enemy king. Same political-stakes enemies-to-romance structure with slow burn that pays off across books.' , isbn: '9781734506204' },
      { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', why: 'A human in a vampire tournament where only one survives. Dark romantasy with the same compete-to-survive-while-falling-for-the-wrong-person momentum.' , isbn: '9781728295336' },
    ],
    faqs: [
      { q: 'Is The Jasad Heir a series?', a: 'Yes, book 1 of the Jasad series. Book 2 (The Scorched Throne) is out. Series planned for 3 books. Read in order, the story arcs across the full series and book 1\'s ending sets up everything that follows.' },
      { q: 'How does The Jasad Heir compare to An Ember in the Ashes?', a: 'Similar cultural inspiration (Arab mythology and architecture) but different in tone. Jasad Heir leans more romantasy, spicier slow burn, more court politics romance. Ember in the Ashes is YA-adjacent with less explicit romance. Fans of one typically love both.' },
      { q: 'Is the magic system in The Jasad Heir complex?', a: 'Moderately. Jasadi magic is hereditary and tied to emotion, the rules are revealed gradually rather than front-loaded. Readers who struggle with dense Sanderson-style magic systems report enjoying Jasad Heir\'s more intuitive approach.' },
    ],
  },

  'the-bridge-kingdom': {
    sourceTitle: 'The Bridge Kingdom',
    sourceAuthor: 'Danielle L. Jensen',
    sourceAbout: "The Bridge Kingdom is r/Romantasy's go-to when someone wants the trained-spy-marries-the-enemy trope done right. Lara was raised her entire life for one mission: marry the king of the Bridge Kingdom, then destroy it from within. The problem is that Aren isn't the monster she was told he was, and the kingdom isn't either, so every reveal lands like a betrayal from both directions. Readers single out Jensen's tight plotting and the genuinely complex 'who's lying to whom' tension. Spice is moderate (2-3), closer to ACOTAR book 1; the emotional whiplash is the real draw. An underrated pick that consistently overdelivers.",
    recs: [
      { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', why: 'Feyre Archeron, a mortal huntress, is dragged into the enchanted fae lands after killing a wolf, and pulled into a world of dangerous courts, dark magic, and a love that will unmake and remake her. The romantasy foundation every Bridge Kingdom reader either already knows or needs to read next. Fae courts, political intrigue, a morally grey love interest, slow burn to inferno.' , isbn: '9781635575569' },
      { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', why: 'Same the-world-I-was-told-about-is-a-lie reveal structure. A sheltered girl discovers the truth about her role in her kingdom. Same romantasy DNA with more spice.' , isbn: '9781952457760' },
      { title: 'An Ember in the Ashes', author: 'Sabaa Tahir', why: 'Laia of Serra infiltrates a brutal military academy as a spy to free her imprisoned brother, while a soldier named Elias questions the empire he was raised to serve. Same spy-in-enemy-territory-while-feelings-complicate-everything momentum. The most-mentioned Bridge Kingdom readalike for readers who want more plot.' , isbn: '9780008149635' },
      { title: 'The Jasad Heir', author: 'Sara Hashem', why: 'A Jasadi survivor must compete in a deadly tournament while hiding her identity from the general hunting her. Same political-enemies-who-fall-for-each-other structure.' , isbn: '9780316477864' },
      { title: 'The Cruel Prince', author: 'Holly Black', why: 'The fae enemies-to-lovers blueprint. A mortal girl in the faerie court schemes against the prince who despises her. The template Bridge Kingdom\'s betrayal arc builds on.' , isbn: '9781955876162' },
      { title: 'Daughter of the Moon Goddess', author: 'Sue Lynn Tan', why: 'Xingyin grows up hiding on the moon, her mother imprisoned by the Emperor of the Immortal Realm, and must enter the Celestial Kingdom disguised to earn her mother\'s freedom. Same sense of a woman doing impossible things to survive in a world built to crush her, and a love interest who complicates everything.' , isbn: '9780063031302' },
    ],
    faqs: [
      { q: 'Is The Bridge Kingdom a complete series?', a: 'The Bridge Kingdom series has 4 books total. Books 1-2 (The Bridge Kingdom, The Traitor Queen) are Aren and Lara\'s story, read these in order first. Books 3-4 follow different couples in the same world and can be read after.' },
      { q: 'How spicy is The Bridge Kingdom?', a: 'Spice level 2-3, explicit scenes, but the emotional tension is the primary driver. Less spicy than From Blood and Ash or Fourth Wing, comparable to A Court of Thorns and Roses book 1.' },
      { q: 'What\'s Danielle L. Jensen\'s best standalone?', a: 'The Dark Shores series (naval fantasy, gladiators, political intrigue) is her other major work. Different tone, more epic fantasy, less romance-forward, but the same tight plotting that makes Bridge Kingdom compulsive reading.' },
    ],
  },
};
