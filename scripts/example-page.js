const EXAMPLE_PAGE_PATH = '__example__/waylight_demo.md';

const EXAMPLE_PAGE_RAW = `---
type: regel
namn: Waylight — funktionsdemo
länkar:
  regler: [besvarjelser, grundegenskaper]
relaterat: [vapenfardigheter]
taggar: [demo, exempel, waylight]
status: draft
toc: true
toc_nivaer: [2, 3]
---

Den här sidan är en **levande referens** över Waylights formateringsmöjligheter — genererad direkt i webbläsaren, inte hämtad från Waypoints. Öppna den igen när som helst genom att skriva \`showExample();\` i webbläsarens devtools-konsol.

Sidan använder (nästan) alla frontmatter-fält och alla wrapper-taggar som finns tillgängliga, både i sin block- och sin -inline-variant, så du kan se exakt hur de renderas i praktiken.

## Frontmatter som används på den här sidan

Högst upp i den här filens källtext finns följande frontmatter:

* **{.rå-inline}type: regel{/}** — ger den §-ikonen du ser i tabbarna och trädet.
* **{.rå-inline}namn{/}** — visningsnamnet du ser i tabben, träd och sidtitel.
* **{.rå-inline}länkar{/}** — kategoriserade länkar (regler), visas i länkpanelen till höger.
* **{.rå-inline}relaterat{/}** — en okategoriserad länklista, visas i sin egen sektion i länkpanelen.
* **{.rå-inline}taggar{/}** — fria sökord, matchas när du söker i trädet.
* **{.rå-inline}status: draft{/}** — ger den "✎ utkast"-badgen bredvid typ-badgen ovanför den här rubriken.
* **{.rå-inline}toc: true{/}** och **{.rå-inline}toc_nivaer: [2, 3]{/}** — genererar innehållsförteckningen du ser överst, med både H2- och H3-rubriker inkluderade och H3 indenterad under sin H2.

Två fält demonstreras inte aktivt här (de skulle motverka sitt eget syfte på just den här sidan):

* **{.rå-inline}delbar: true{/}** — visar en "🔗 Kopiera delningslänk"-knapp, men bara meningsfull på riktiga, delbara sidor i Waypoints — en delningslänk till den här syntetiska demosidan vore poänglös eftersom sidan inte existerar för mottagaren.
* **{.rå-inline}tillbaka_knapp: false{/}** — döljer den flytande scrolla-till-toppen-knappen. Den här sidan är avsiktligt lång för att kunna visa alla taggarna, så knappen lämnas påslagen (default) här som exempel på just det — men fältet finns för den som vill stänga av den på korta sidor.

## Wikilänkar

Skriv {.rå-inline}[[kortnamn]]{/} för att länka till en annan sida. Länktexten blir automatiskt målsidans \`namn\`-fält: [[besvarjelser]].

Lägg till en pipe för att styra visningstexten separat från målet, till exempel för att böja ordet grammatiskt: en karaktär kan lära sig en [[vapenfardigheter|vapenfärdighet]] tidigt i sin karriär.

En trasig länk (till något som inte finns) visas olänkad men markerad: [[nagot_som_inte_finns]].

## Wrapper-taggar: {.rå-inline}{.klass}...{/}{/}

Dessa taggar fungerar både **block** (default — egen ram/rad, bryter stycket) och **inline** (lägg till suffixet {.rå-inline}-inline{/} på klassnamnet, t.ex. {.rå-inline}{.viktigt-inline}{/}{/} — ingen egen rad, kan aldrig bryta det omgivande stycket). Det här går att göra på vilken klass som helst, fördefinierad eller egen.

### spelledare

Blockvarianten (default), alltid inramad, både låst och upplåst:

{.spelledare}Det här är spelledarinnehåll. Rutan syns alltid, brun/guld — perfekt för taktikråd eller hemligheter som SL ändå ska se tydligt markerade även efter att spelarna låst upp sidan.{/}

Inline-varianten (\`-inline\`), för en kortare SL-notis mitt i en mening: kom ihåg att {.spelledare-inline}den här fällan har en dold utlösare{/} innan spelarna kliver in i rummet.

Om du inte är upplåst just nu ser du istället en låsnotis där ovan istället för texten — kompakt för inline, full text för block.

### konfidentiellt

Blockvarianten döljer ett helt stycke tills sidan (eller specifikt den här taggen) låses upp:

{.konfidentiellt}
Det här stycket är helt dolt tills sidan (eller specifikt den här taggen) låses upp. Till skillnad från spelledare-taggen renderas det sedan **helt normalt, utan någon ram** — som om taggen aldrig funnits. Bra för att gömma en spoiler mitt i en annars publik sida, utan att permanent stämpla innehållet som "SL-material".

Den kan även omsluta ett helt block med rubriker och tabeller:

#### Ett dolt exempel på statistik

| Kolumn A | Kolumn B |
| :--- | :--- |
| Rad 1 | 42 |
| Rad 2 | 7 |
{/}

Inline-varianten döljer bara en enstaka fras mitt i en mening — monstrets svaghet är {.konfidentiellt-inline}eld{/}, vilket spelarna får räkna ut själva.

### bildtext

En bild följt av en bildtext:

{.bildtext}Så här ser en bildtext ut — centrerad, kursiv, något mindre text direkt under en bild.{/}

### viktigt

Blockvarianten för ett helt viktigt stycke, avskilt från resten av texten:

{.viktigt}Det här är ett helt stycke som markerats som viktigt — egen ram, guld-understrykning, bryter medvetet layouten för att synas.{/}

Inline-varianten för en enstaka viktig fras: kom ihåg att {.viktigt-inline}den här delen av meningen är extra viktig{/} — guld-understrykning, fetstil, utan att dölja något eller bryta stycket.

### effekt

Vissa spelmekaniska effekter kan vara positiva, andra negativa — som block:

{.effekt}En neutral lila färg används för hela den här effektbeskrivningen, snarare än grönt eller rött, som annars lätt läses som "bra" respektive "dåligt".{/}

Eller inline, mitt i en mening: vapnet ger {.effekt-inline}+2 mot odöda{/} men {.effekt-inline}-1 i mörker{/}.

### citat

Som block, ett fristående citat:

{.citat}"Ingen sten förblir orörd, ingen skugga oövervakad." — ur en gammal, sliten skrift{/}

Eller inline, insmällt i löptexten: hon viskade att {.citat-inline}"ingen återvänder från Skuggornas gränd"{/} innan hon försvann i mörkret.

Kursiv, serif-font — passar för in-universe-citat eller stämningsfulla rader, oavsett variant.

### exempel

Initiativ avgör turordning i strid: alla slår 1T10 och lägger till sin INIT-bonus.

{.exempel}
Anna har INIT-bonus +2 och slår en 6:a på tärningen, vilket ger totalt 8.
Björn har INIT-bonus +4 och slår en 3:a, vilket också ger totalt 7.
Anna går alltså före Björn i turordningen.
{/}

Ett tydligt avgränsat block med en automatisk "Exempel:"-etikett — bra för konkreta tillämpningar direkt efter en regelbeskrivning.

Inline-varianten är mer kompakt, till exempel {.exempel-inline}INIT +3, slår en 5:a, totalt 8{/}, användbar mitt i en förklarande mening.

### rå

Den här taggen escapear sitt innehåll ordagrant — ingen markdown- eller taggparsning sker, och den kan innehålla bokstavlig {.rå-inline}{.klass}{/}{/}-syntax utan att den tolkas. Det är så den här sidan visar upp syntax-exempel överallt, som {.rå-inline}{.viktigt-inline}text{/}{/} ovan.

Blockvarianten fungerar som ett kort kodblock:

{.rå}
{.effekt}+2 mot odöda{/}
{.viktigt-inline}en hel rad kod{/}
{/}

Inline-varianten fungerar som \`kod\` mitt i en mening: skriv {.rå-inline}[[kortnamn]]{/} för att länka till en sida.

Taggen fungerar även nästlad i andra taggar — till exempel om du vill visa exempel-syntax inuti en {.viktigt-inline}viktigt-markering som visar {.rå-inline}{.spelledare}{/}{/} som exempel{/}.

### nyckelord

Till skillnad från övriga taggar är {.nyckelord}nyckelord{/} en ren inline-tagg som alltid är inline oavsett suffix: den körs aldrig genom markdown-parsern och kan därför aldrig bryta stycket den står i, oavsett hur den placeras — även mitt i en mening som denna, där ordet {.nyckelord}närstridshot{/} lyfts fram utan att texten runt omkring påverkas.

### Nästlade taggar

Taggar kan nästlas i varandra, i valfri kombination av block och inline. Här är en {.konfidentiellt}dold sektion med en {.spelledare-inline}inbäddad, kompakt spelledaranteckning som förblir skyddad oavsett{/} även efter att den yttre konfidentiella-taggen låsts upp.{/}

## TODO-markering

> **TODO:** Det här är hur ofärdigt innehåll flaggas visuellt under skrivandet — ett citatblock som inleds med **TODO:**.

## Tabeller

| Element | Effekt mot svaghet |
| :--- | :---: |
| Eld | 200% |
| Vatten | 200% |
| Jord | 150% |
| Luft | 150% |

## Bilder

Bilder länkas med vanliga, filsystem-relativa sökvägar (samma som GitHub:s egen förhandsvisning använder), till exempel: {.rå-inline}![Alt-text](../../bilder/monster/mellan/dravul.webp "Titel"){/}. De lat-laddas automatiskt och hämtas aldrig i förväg.

## Låssystemet

Allt \`aventyr/\`-innehåll är implicit konfidentiellt. Globalt innehåll (regler, monster, karaktärer, föremål, klasser) kan flaggas manuellt med {.rå-inline}konfidentiell: true{/} i sin frontmatter. Låset är en UX-spärr för att hålla spelare borta från spoilers, inte kryptografiskt skydd.

## Delning via URL

Waylight synkar öppna flikar, aktiv flik, sök-status och (om satt) reveal-status till adressfältets query-parametrar automatiskt — kopiera bara URL:en för att dela exakt din nuvarande vy.

---

Det var en genomgång av (nästan) alla byggstenar. Skriv \`showExample();\` igen när som helst för att komma tillbaka hit.
`;

function showExample() {
  if (!state.files.has(EXAMPLE_PAGE_PATH)) {
    const parsed = parseFile(EXAMPLE_PAGE_PATH, EXAMPLE_PAGE_RAW);
    state.files.set(EXAMPLE_PAGE_PATH, {
      ...parsed,
      raw: EXAMPLE_PAGE_RAW,
      path: EXAMPLE_PAGE_PATH,
      folder: '__example__',
    });
  }

  openTab(EXAMPLE_PAGE_PATH);
}

window.showExample = showExample;
