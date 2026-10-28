import http from "node:http";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

process.on("uncaughtException", (err) => {
  console.error("[tvproxy] Process uncaughtException (handled):", err?.message || err);
});
process.on("unhandledRejection", (err) => {
  console.error("[tvproxy] Process unhandledRejection (handled):", err?.message || err);
});

const PORT = Number(process.env.PORT || 8899);
const PING_URL = "https://www.vavoo.tv/api/app/ping";
const BASE_SITES = ["https://kool.to", "https://vavoo.to"];
const XMLTV_FR_URL = "https://xmltvfr.fr/xmltv/xmltv_fr.xml";

const CHANNELS = [
  // === TNT FRANÇAISE (1-25) ===
  { chno: 1, slug: "tf1", name: "TF1", tvgId: "TF1.fr", group: "TNT", patterns: [/^TF1 FHD\b/i, /^TF1 HD\b/i, /^TF1 \./i] },
  { chno: 2, slug: "france2", name: "France 2", tvgId: "France2.fr", group: "TNT", patterns: [/^FRANCE 2 HD\b/i, /^FRANCE 2 FHD\b/i, /^FRANCE 2 \./i] },
  { chno: 3, slug: "france3", name: "France 3", tvgId: "France3.fr", group: "TNT", patterns: [/^FRANCE 3 HD\b/i, /^FRANCE 3 FHD\b/i, /^FRANCE 3 \./i] },
  { chno: 4, slug: "canalplus", name: "Canal+", tvgId: "CanalPlus.fr", group: "TNT", patterns: [/^CANAL\+ FHD\b/i, /^CANAL\+ HD\b/i, /^CANAL\+ \./i, /^CANAL \+ HD\b/i] },
  { chno: 5, slug: "france5", name: "France 5", tvgId: "France5.fr", group: "TNT", patterns: [/^FRANCE 5 HD\b/i, /^FRANCE 5 FHD\b/i, /^FRANCE 5 \./i] },
  { chno: 6, slug: "m6", name: "M6", tvgId: "M6.fr", group: "TNT", patterns: [/^M6 FHD\b/i, /^M6 HD\b/i, /^M6 \./i] },
  { chno: 7, slug: "arte", name: "Arte", tvgId: "Arte.fr", group: "TNT", patterns: [/^ARTE FHD\b/i, /^ARTE HD\b/i, /^ARTE \./i], fallbacks: ["https://artesimulcast.akamaized.net/hls/live/2031003/artelive_fr/index.m3u8"] },
  { chno: 8, slug: "lcp", name: "LCP", tvgId: "LaChaineParlementaire.fr", group: "TNT", patterns: [/^LCP\b/i, /^LA CHAINE PARLEMENTAIRE/i] },
  { chno: 9, slug: "w9", name: "W9", tvgId: "W9.fr", group: "TNT", patterns: [/^W9 FHD\b/i, /^W9 HD\b/i, /^W9 \./i] },
  { chno: 10, slug: "tmc", name: "TMC", tvgId: "TMC.fr", group: "TNT", patterns: [/^TMC FHD\b/i, /^TMC HD\b/i, /^TMC \./i] },
  { chno: 11, slug: "tfx", name: "TFX", tvgId: "NT1.fr", group: "TNT", patterns: [/^TFX FHD\b/i, /^TFX HD\b/i, /^TFX \./i] },
  { chno: 12, slug: "gulli", name: "Gulli", tvgId: "Gulli.fr", group: "TNT", patterns: [/^GULLI FHD\b/i, /^GULLI HD\b/i, /^GULLI \./i] },
  { chno: 13, slug: "bfmtv", name: "BFM TV", tvgId: "BFMTV.fr", group: "TNT", patterns: [/^BFM TV HD\b/i, /^BFM HD\b/i, /^BFM TV \./i] },
  { chno: 14, slug: "cnews", name: "CNews", tvgId: "CNews.fr", group: "TNT", patterns: [/^CNEWS FHD\b/i, /^CNEWS HD\b/i, /^CNEWS \./i] },
  { chno: 15, slug: "lci", name: "LCI", tvgId: "LCI.fr", group: "TNT", patterns: [/^LCI HD\b/i, /^LCI FHD\b/i, /^LCI \./i] },
  { chno: 16, slug: "franceinfo", name: "franceinfo:", tvgId: "FranceInfo.fr", group: "TNT", patterns: [/^FRANCE INFO\b/i, /^FRANCEINFO\b/i] },
  { chno: 17, slug: "cstar", name: "CStar", tvgId: "CStar.fr", group: "TNT", patterns: [/^CSTAR FHD\b/i, /^CSTAR HD\b/i, /^CSTAR \./i, /^C STAR\b/i] },
  { chno: 18, slug: "t18", name: "T18 / C8", tvgId: "T18.fr", group: "TNT", patterns: [/^C8 HD\b/i, /^C8 \./i] },
  { chno: 19, slug: "france4", name: "France 4", tvgId: "France4.fr", group: "TNT", patterns: [/^FRANCE 4 HD\b/i, /^FRANCE 4 \./i] },
  { chno: 20, slug: "tf1-series-films", name: "TF1 Séries Films", tvgId: "TF1SeriesFilms.fr", group: "TNT", patterns: [/^TF1 SERIES & FILM HD\b/i, /^TF1 SERIES & FILM\b/i, /^TF1 SERIES/i] },
  { chno: 21, slug: "lequipe", name: "L'Équipe", tvgId: "LEquipe21.fr", group: "TNT", patterns: [/^EQUIPE HD\b/i, /^L EQUIPE \./i, /^LEQUIPE \./i, /^L'EQUIPE/i] },
  { chno: 22, slug: "6ter", name: "6ter", tvgId: "6ter.fr", group: "TNT", patterns: [/^6TER FHD\b/i, /^6TER HD\b/i, /^6TER \./i] },
  { chno: 23, slug: "rmc-story", name: "RMC Story", tvgId: "Numero23.fr", group: "TNT", patterns: [/^RMC STORY/i], fallbacks: ["https://d15aro46bnpfm8.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-fqkqiax1078up/RMC_Story_FR.m3u8"] },
  { chno: 24, slug: "rmc-decouverte", name: "RMC Découverte", tvgId: "RMCDecouverte.fr", group: "TNT", patterns: [/^RMC DECOUVERTE/i], fallbacks: ["https://d16zzycxcd0m0r.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-hixvx5kymecr9/RMC_Decouverte_FR.m3u8"] },
  { chno: 25, slug: "cherie25", name: "Chérie 25 / RMC Life", tvgId: "Cherie25.fr", group: "TNT", patterns: [/^CHERIE 25/i], fallbacks: ["https://d3dcdjv6dx07iz.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-eaaww2dyp3iih/RMC_Life_FR.m3u8"] },

  // === SUISSE & BELGIQUE (Sport / F1 en clair) ===
  { chno: 26, slug: "rts1", name: "RTS 1 (Suisse)", tvgId: "RTSUn.ch", group: "Suisse & Belgique", patterns: [/^RTS UNE \./i, /^RTS 1 \./i] },
  { chno: 27, slug: "rts2", name: "RTS 2 (Suisse)", tvgId: "RTSDeux.ch", group: "Suisse & Belgique", patterns: [/^RTS DEUX \./i, /^RTS 2 \./i] },
  { chno: 28, slug: "la-une", name: "RTBF La Une (Belgique)", tvgId: "LaUne.be", group: "Suisse & Belgique", patterns: [/^LA UNE \.s/i, /^LA UNE \.c/i, /^LA UNE\b/i] },

  // === FOOT & SPORT ===
  { chno: 30, slug: "canalplus-foot", name: "Canal+ Foot", tvgId: "CanalPlusFoot.fr", group: "Foot & Sport", patterns: [/^CANAL\+ FOOT FHD\b/i, /^CANAL\+ FOOT HD\b/i, /^CANAL\+ FOOT \./i] },
  { chno: 31, slug: "canalplus-sport", name: "Canal+ Sport", tvgId: "CanalPlusSport.fr", group: "Foot & Sport", patterns: [/^CANAL\+ SPORT FHD\b/i, /^CANAL\+ SPORT HD\b/i, /^CANAL\+ SPORT \./i, /^CANAL SPORT\b/i] },
  { chno: 32, slug: "canalplus-sport360", name: "Canal+ Sport 360", tvgId: "CanalPlusSport360.fr", group: "Foot & Sport", patterns: [/^CANAL\+ SPORT 360\b/i, /^CANAL\+ 360 FHD\b/i] },
  { chno: 33, slug: "canalplus-pl", name: "Canal+ Premier League", tvgId: "CanalPlusPremierLeague.fr", group: "Foot & Sport", patterns: [/^CANAL\+ PREMIER LEAGUE\b/i, /^CANAL\+ PL \./i] },
  { chno: 34, slug: "ligue1plus-1", name: "Ligue 1+", tvgId: "Ligue1Plus.fr", group: "Foot & Sport", patterns: [/^LIGUE 1\+ \.s$/i, /^LIGUE\+ 1 \.c$/i, /^CANAL \+ LIGUE 1\b/i, /^DAZN LIGUE 1 LIVE 1 FHD\b/i, /^DAZN LIGUE 1 LIVE 1 HD\b/i] },
  { chno: 35, slug: "dazn1", name: "DAZN 1", tvgId: "DAZN.fr", group: "Foot & Sport", patterns: [/^DAZN 1 \.c$/i, /^DAZN SPORT 1 FHD\b/i, /^DAZN 1 \.s$/i, /^DAZN LIGUE 1 LIVE 1 FHD\b/i] },
  { chno: 36, slug: "bein1", name: "beIN Sports 1", tvgId: "beINSPORTS1.fr", group: "Foot & Sport", patterns: [/^BEIN SPORTS 1 FHD \.b$/i, /^BEIN SPORTS 1 \.b$/i, /^BEIN SPORTS 1 \.c$/i, /^BEIN SPORTS 1 HD \.b$/i, /^BEIN SPORTS 1 \[LIVE/i, /^BEIN SPORTS 1 \.s$/i] },
  { chno: 37, slug: "bein2", name: "beIN Sports 2", tvgId: "beINSPORTS2.fr", group: "Foot & Sport", patterns: [/^BEIN SPORTS 2 FHD \.b$/i, /^BEIN SPORTS 2 \.b$/i, /^BEIN SPORTS 2 \.c$/i, /^BEIN SPORTS 2 HD \.b$/i, /^BEIN SPORTS 2 FHD \.s$/i, /^BEIN SPORTS 2 \.s$/i] },
  { chno: 38, slug: "bein3", name: "beIN Sports 3", tvgId: "beINSPORTS3.fr", group: "Foot & Sport", patterns: [/^BEIN SPORTS 3 FHD \.b$/i, /^BEIN SPORTS 3 \.b$/i, /^BEIN SPORTS 3 \.c$/i, /^BEIN SPORTS 3 HD \.b$/i, /^BEIN SPORTS 3 FHD \.s$/i, /^BEIN SPORTS 3 \.s$/i] },
  { chno: 39, slug: "rmcsport1", name: "RMC Sport 1", tvgId: "RMCSport1.fr", group: "Foot & Sport", patterns: [/^RMC SPORT 1 FHD\b/i, /^RMC SPORT 1 \.c$/i, /^RMC SPORT 1 \.b$/i, /^RMC SPORT 1 HD\b/i, /^RMC SPORT 1 \.s$/i] },
  { chno: 40, slug: "eurosport1", name: "Eurosport 1", tvgId: "Eurosport1.fr", group: "Foot & Sport", patterns: [/^EUROSPORT 1 FHD\b/i, /^EUROSPORT 1 HD\b/i, /^EUROSPORT 1 \./i] },
  { chno: 41, slug: "eurosport2", name: "Eurosport 2", tvgId: "Eurosport2.fr", group: "Foot & Sport", patterns: [/^EUROSPORT 2 HD\b/i, /^EUROSPORT 2 \./i] },
  { chno: 42, slug: "dazn2", name: "DAZN 2", tvgId: "DAZN.fr", group: "Foot & Sport", patterns: [/^DAZN 2 \.c$/i, /^DAZN 2\b/i, /^DAZN SPORT 2\b/i] },
  { chno: 43, slug: "bein-max4", name: "beIN Sports Max 4", tvgId: "beINSPORTSMAX4.fr", group: "Foot & Sport", patterns: [/^BEIN SPORTS MAX 4\b/i] },
  { chno: 44, slug: "bein-max5", name: "beIN Sports Max 5", tvgId: "beINSPORTSMAX5.fr", group: "Foot & Sport", patterns: [/^BEIN SPORTS MAX 5\b/i] },
  { chno: 45, slug: "bein-max6", name: "beIN Sports Max 6", tvgId: "beINSPORTSMAX6.fr", group: "Foot & Sport", patterns: [/^BEIN SPORTS MAX 6\b/i] },
  { chno: 46, slug: "bein-max7", name: "beIN Sports Max 7", tvgId: "beINSPORTSMAX7.fr", group: "Foot & Sport", patterns: [/^BEIN SPORTS MAX 7\b/i] },
  { chno: 47, slug: "bein-max9", name: "beIN Sports Max 9", tvgId: "beINSPORTSMAX9.fr", group: "Foot & Sport", patterns: [/^BEIN SPORTS MAX 9\b/i] },
  { chno: 48, slug: "bein-max10", name: "beIN Sports Max 10", tvgId: "beINSPORTSMAX10.fr", group: "Foot & Sport", patterns: [/^BEIN SPORTS MAX 10\b/i] },

  // === CINÉMA & SÉRIES (50-67) ===
  { chno: 50, slug: "canalplus-boxoffice", name: "Canal+ Box Office", tvgId: "CanalPlusBoxOffice.fr", group: "Cinéma & Séries", patterns: [/^CANAL\+ BOX OFFICE\b/i] },
  { chno: 51, slug: "canalplus-cinema", name: "Canal+ Cinéma(s)", tvgId: "CanalPlusCinema.fr", group: "Cinéma & Séries", patterns: [/^CANAL\+ CINEMA\b/i, /^CANAL\+ CINEMAS\b/i] },
  { chno: 52, slug: "canalplus-grandecran", name: "Canal+ Grand Écran", tvgId: "CanalPlusGrandEcran.fr", group: "Cinéma & Séries", patterns: [/^CANAL\+ GRAND ECRAN\b/i] },
  { chno: 53, slug: "canalplus-series", name: "Canal+ Séries", tvgId: "CanalPlusSeries.fr", group: "Cinéma & Séries", patterns: [/^CANAL\+ SERIES\b/i] },
  { chno: 54, slug: "canalplus-docs", name: "Canal+ Docs", tvgId: "CanalPlusDocs.fr", group: "Cinéma & Séries", patterns: [/^CANAL\+ DOCS\b/i] },
  { chno: 55, slug: "canalplus-kids", name: "Canal+ Kids", tvgId: "CanalPlusKIDS.fr", group: "Cinéma & Séries", patterns: [/^CANAL\+ KIDS\b/i] },
  { chno: 56, slug: "cineplus-premier", name: "Ciné+ Premier", tvgId: "CinePlusPremier.fr", group: "Cinéma & Séries", patterns: [/^CINE\+ PREMIER\b/i] },
  { chno: 57, slug: "cineplus-frisson", name: "Ciné+ Frisson", tvgId: "CinePlusFrisson.fr", group: "Cinéma & Séries", patterns: [/^CINE\+ FRISSON\b/i] },
  { chno: 58, slug: "cineplus-emotion", name: "Ciné+ Emotion", tvgId: "CinePlusEmotion.fr", group: "Cinéma & Séries", patterns: [/^CINE\+ EMOTION\b/i] },
  { chno: 59, slug: "cineplus-famiz", name: "Ciné+ Famiz", tvgId: "CinePlusFamiz.fr", group: "Cinéma & Séries", patterns: [/^CINE\+ FAMIZ\b/i] },
  { chno: 60, slug: "cineplus-club", name: "Ciné+ Club", tvgId: "CinePlusClub.fr", group: "Cinéma & Séries", patterns: [/^CINE\+ CLUB\b/i] },
  { chno: 61, slug: "cineplus-classic", name: "Ciné+ Classic", tvgId: "CinePlusClassic.fr", group: "Cinéma & Séries", patterns: [/^CINE\+ CLASSIC\b/i] },
  { chno: 62, slug: "polarplus", name: "Polar+", tvgId: "PolarPlus.fr", group: "Cinéma & Séries", patterns: [/^POLAR\+\s*\.c$/i, /^POLAR\+\s*\.s$/i, /^POLAR\+ FHD/i, /^POLAR\+/i] },
  { chno: 63, slug: "action", name: "Action", tvgId: "Action.fr", group: "Cinéma & Séries", patterns: [/^ACTION\b/i] },
  { chno: 64, slug: "paramount-channel", name: "Paramount Channel", tvgId: "ParamountChannel.fr", group: "Cinéma & Séries", patterns: [/^PARAMOUNT CHANNEL\b/i] },
  { chno: 65, slug: "tcm-cinema", name: "TCM Cinéma", tvgId: "TCM.fr", group: "Cinéma & Séries", patterns: [/^TCM CINEMA\b/i] },
  { chno: 66, slug: "warnertv", name: "Warner TV", tvgId: "WarnerTV.fr", group: "Cinéma & Séries", patterns: [/^WARNER\b/i] },
  { chno: 67, slug: "tv-breizh", name: "TV Breizh", tvgId: "TvBreizh.fr", group: "Cinéma & Séries", patterns: [/^TV BREIZH\b/i] },

  // === MULTIPLEX, COUPE D'EUROPE & AUTO (70-79) ===
  { chno: 70, slug: "canalplus-live1", name: "Canal+ Live 1", tvgId: "CanalPlusLive1.fr", group: "Multiplex & Auto", patterns: [/^CANAL\+ LIVE 1\b/i] },
  { chno: 71, slug: "canalplus-live2", name: "Canal+ Live 2", tvgId: "CanalPlusLive2.fr", group: "Multiplex & Auto", patterns: [/^CANAL\+ LIVE 2\b/i] },
  { chno: 72, slug: "canalplus-live3", name: "Canal+ Live 3", tvgId: "CanalPlusLive3.fr", group: "Multiplex & Auto", patterns: [/^CANAL\+ LIVE 3\b/i] },
  { chno: 73, slug: "canalplus-live4", name: "Canal+ Live 4", tvgId: "CanalPlusLive4.fr", group: "Multiplex & Auto", patterns: [/^CANAL\+ LIVE 4\b/i] },
  { chno: 74, slug: "canalplus-live5", name: "Canal+ Live 5", tvgId: "CanalPlusLive5.fr", group: "Multiplex & Auto", patterns: [/^CANAL\+ LIVE 5\b/i] },
  { chno: 75, slug: "multisports4", name: "Multisports 4", tvgId: "Multisports4.fr", group: "Multiplex & Auto", patterns: [/^MULTISPORT 4 \.s/i, /^MULTISPORTS 4 \.c/i, /^MULTISPORTS 4\b/i, /^MULTISPORT 4\b/i] },
  { chno: 76, slug: "automoto", name: "Automoto La Chaîne", tvgId: "ABMoteurs.fr", group: "Multiplex & Auto", patterns: [/^AUTOMOTO/i] },

  // === DÉCOUVERTE & SCIENCES (80-93) ===
  { chno: 80, slug: "discovery", name: "Discovery Channel", tvgId: "DiscoveryChannel.fr", group: "Découverte & Sciences", patterns: [/^DISCOVERY CHANNEL\b/i] },
  { chno: 81, slug: "discovery-science", name: "Discovery Science", tvgId: "DiscoveryScience.fr", group: "Découverte & Sciences", patterns: [/^DISCOVERY SCIENCE\b/i] },
  { chno: 82, slug: "discovery-investigation", name: "Discovery Investigation", tvgId: "DiscoveryInvestigation.fr", group: "Découverte & Sciences", patterns: [/^DISCOVERY INVESTIGATION\b|^INVESTIGATION DISCOVERY\b/i] },
  { chno: 83, slug: "natgeo", name: "National Geographic", tvgId: "NationalGeographic.fr", group: "Découverte & Sciences", patterns: [/^NAT.*GEO\b(?!.*WILD)/i] },
  { chno: 84, slug: "natgeo-wild", name: "Nat Geo Wild", tvgId: "NatGeoWild.fr", group: "Découverte & Sciences", patterns: [/^NAT.*GEO WILD\b/i] },
  { chno: 85, slug: "planete-crime", name: "Planète+ Crime", tvgId: "PLANETEJustice.fr", group: "Découverte & Sciences", patterns: [/^PLANETE\+ CRIME\b/i] },
  { chno: 86, slug: "planete-aventure", name: "Planète+ Aventure", tvgId: "PlaneteAction.fr", group: "Découverte & Sciences", patterns: [/^PLANETE\+ AVENTURE\b/i] },
  { chno: 87, slug: "ushuaia", name: "Ushuaïa TV", tvgId: "UshuaiaTV.fr", group: "Découverte & Sciences", patterns: [/^USHUAIA/i] },
  { chno: 88, slug: "histoire", name: "Histoire TV", tvgId: "Histoire.fr", group: "Découverte & Sciences", patterns: [/^HISTOIRE\b/i] },
  { chno: 89, slug: "toute-histoire", name: "Toute l'Histoire", tvgId: "TouteHistoire.fr", group: "Découverte & Sciences", patterns: [/^TOUTE L HISTOIRE\b|^TOUTE L'HISTOIRE\b/i] },
  { chno: 90, slug: "science-et-vie", name: "Science & Vie TV", tvgId: "ScienceEtVieTV.fr", group: "Découverte & Sciences", patterns: [/^SCIENCE & VIE/i] },
  { chno: 91, slug: "animaux", name: "Animaux", tvgId: "Animaux.fr", group: "Découverte & Sciences", patterns: [/^ANIMAUX\b/i] },
  { chno: 92, slug: "trek", name: "Trek", tvgId: "Trek.fr", group: "Découverte & Sciences", patterns: [/^TREK HD \.s/i, /^TREK \.c/i, /^TREK\b/i] },
  { chno: 93, slug: "seasons", name: "Seasons", tvgId: "Seasons.fr", group: "Découverte & Sciences", patterns: [/^SEASONS \.c/i, /^SEASON \.b/i, /^SEASON \.s/i, /^SEASONS HD/i, /^SEASONS?\b/i] },

  // === SÉRIES & DIVERTISSEMENT (95-101) ===
  { chno: 95, slug: "13e-rue", name: "13ème Rue", tvgId: "13eRue.fr", group: "Séries & Divertissement", patterns: [/^13\s*EME RUE\b|^13EME RUE/i] },
  { chno: 96, slug: "syfy", name: "Syfy", tvgId: "Syfy.fr", group: "Séries & Divertissement", patterns: [/^SYFY\b/i] },
  { chno: 97, slug: "comedie-plus", name: "Comédie+", tvgId: "ComediePlus.fr", group: "Séries & Divertissement", patterns: [/^COMEDIE\+?\b/i] },
  { chno: 98, slug: "paris-premiere", name: "Paris Première", tvgId: "ParisPremiere.fr", group: "Séries & Divertissement", patterns: [/^PARIS PREMIERE\b/i] },
  { chno: 99, slug: "teva", name: "Téva", tvgId: "Teva.fr", group: "Séries & Divertissement", patterns: [/^TEVA\b/i] },
  { chno: 100, slug: "ab1", name: "AB1", tvgId: "AB1.fr", group: "Séries & Divertissement", patterns: [/^AB1\b/i] },

  // === JEUNESSE (105-113) ===
  { chno: 105, slug: "disney-channel", name: "Disney Channel", tvgId: "DisneyChannel.fr", group: "Jeunesse", patterns: [/^DISNEY CHANNEL\b/i] },
  { chno: 106, slug: "disney-junior", name: "Disney Junior", tvgId: "DisneyJunior.fr", group: "Jeunesse", patterns: [/^DISNEY JUNIOR\b/i] },
  { chno: 107, slug: "cartoon-network", name: "Cartoon Network", tvgId: "CartoonNetwork.fr", group: "Jeunesse", patterns: [/^CARTOON NETWORK\b/i] },
  { chno: 108, slug: "boomerang", name: "Boomerang", tvgId: "Boomerang.fr", group: "Jeunesse", patterns: [/^BOOMERANG\b/i] },
  { chno: 109, slug: "nickelodeon", name: "Nickelodeon", tvgId: "Nickelodeon.fr", group: "Jeunesse", patterns: [/^NICKELODEON\b(?!.*JUNIOR|.*TEEN)/i] },
  { chno: 110, slug: "tiji", name: "TiJi", tvgId: "TIJI.fr", group: "Jeunesse", patterns: [/^TIJI\b/i] },
  { chno: 111, slug: "teletoon-plus", name: "Télétoon+", tvgId: "TeleToonPlus.fr", group: "Jeunesse", patterns: [/^TELETOON\+?\b/i] }
];

const ALLOWED_TVG_IDS = new Set(CHANNELS.map((c) => c.tvgId));

let cachedSig = { value: null, exp: 0 };
let cachedCatalog = { items: [], exp: 0 };
let cachedEpg = { xml: null, logos: new Map(), exp: 0 };
const activeStreams = new Map();

async function getAddonSignature() {
  if (cachedSig.value && Date.now() < cachedSig.exp) {
    return cachedSig.value;
  }
  const ts = Date.now();
  const payload = {
    reason: "app-focus",
    locale: "de",
    theme: "dark",
    metadata: {
      device: { type: "desktop", uniqueId: `node-${ts}` },
      os: { name: "linux", version: "Linux", abis: ["x64"], host: "node" },
      app: { platform: "electron" },
      version: { package: "tv.vavoo.app", binary: "3.1.8", js: "3.1.8" }
    },
    appFocusTime: 0,
    playerActive: false,
    playDuration: 0,
    devMode: false,
    hasAddon: true,
    castConnected: false,
    package: "tv.vavoo.app",
    version: "3.1.8",
    process: "app",
    firstAppStart: ts,
    lastAppStart: ts,
    ipLocation: null,
    adblockEnabled: true,
    proxy: { supported: ["ss"], engine: "Mu", enabled: false, autoServer: true },
    iap: { supported: false }
  };

  const res = await fetch(PING_URL, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json();
  if (!data?.addonSig) throw new Error("Failed to obtain Vavoo addonSig");
  cachedSig = { value: data.addonSig, exp: Date.now() + 240_000 };
  return cachedSig.value;
}

function getCatalogHeaders(sig) {
  return {
    "content-type": "application/json; charset=utf-8",
    "mediahubmx-signature": sig,
    "user-agent": "MediaHubMX/2",
    "accept": "*/*",
    "Accept-Language": "de",
    "Connection": "close"
  };
}

let catalogPromise = null;
async function fetchSiteCatalog(base, sig) {
  let cursor = null;
  const items = [];
  while (true) {
    const res = await fetch(`${base}/mediahubmx-catalog.json`, {
      method: "POST",
      headers: getCatalogHeaders(sig),
      body: JSON.stringify({
        language: "de",
        region: "US",
        catalogId: "iptv",
        id: "iptv",
        adult: false,
        search: "",
        sort: "",
        filter: { group: "France" },
        cursor,
        clientVersion: "3.0.2"
      }),
      signal: AbortSignal.timeout(12000)
    });
    const body = await res.json();
    if (Array.isArray(body?.items)) {
      for (const it of body.items) {
        if (it?.type === "iptv" && it?.url) items.push(it);
      }
    }
    if (!body?.nextCursor) break;
    cursor = body.nextCursor;
  }
  return items;
}

async function getFranceCatalog(force = false) {
  if (!force && cachedCatalog.items.length > 0 && Date.now() < cachedCatalog.exp) {
    return cachedCatalog.items;
  }
  if (catalogPromise) return catalogPromise;
  catalogPromise = (async () => {
    try {
      const sig = await getAddonSignature();
      const results = await Promise.allSettled(BASE_SITES.map((b) => fetchSiteCatalog(b, sig)));
      const combined = [];
      const seen = new Set();
      for (const r of results) {
        if (r.status === "fulfilled" && Array.isArray(r.value)) {
          for (const it of r.value) {
            if (!seen.has(it.name)) {
              seen.add(it.name);
              combined.push(it);
            }
          }
        }
      }
      if (combined.length > 0) {
        cachedCatalog = { items: combined, exp: Date.now() + 900_000 };
        console.log(`[tvproxy] Loaded ${combined.length} France streams across sites`);
        return combined;
      }
      return cachedCatalog.items;
    } finally {
      catalogPromise = null;
    }
  })();
  return catalogPromise;
}

// Build filtered, deduplicated XMLTV EPG for our curated channels with clean Jellyfin categories
async function getFilteredEpg() {
  if (cachedEpg.xml && Date.now() < cachedEpg.exp) {
    return cachedEpg;
  }
  const res = await fetch(XMLTV_FR_URL, { signal: AbortSignal.timeout(25000) });
  const rawXml = await res.text();

  const logos = new Map();
  const outChannels = [];
  const chRegex = /<channel id="([^"]+)">([\s\S]*?)<\/channel>/g;
  let m;
  while ((m = chRegex.exec(rawXml)) !== null) {
    const id = m[1];
    if (!ALLOWED_TVG_IDS.has(id)) continue;
    const iconMatch = m[2].match(/<icon src="([^"]+)"/);
    if (iconMatch) logos.set(id, iconMatch[1]);
    outChannels.push(m[0]);
  }

  const outProgrammes = [];
  const progRegex = /<programme\s+start="([^"]+)"\s+stop="([^"]+)"\s+channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g;
  const fillerRegex = /pas de diffusion|vivez en direct les [ée]v[èe]nements|le plus grand des spectacles|cha[îi]ne [ée]v[ée]nementielle|fin des programmes|programme non communiqu[ée]/i;

  while ((m = progRegex.exec(rawXml)) !== null) {
    const [fullTag, start, stop, channelId, inner] = m;
    if (!ALLOWED_TVG_IDS.has(channelId)) continue;
    if (fillerRegex.test(inner)) continue;

    let extraCat = "";
    const catMatch = inner.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
    const catText = catMatch ? catMatch[1] : "";
    const titleMatch = inner.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const titleText = titleMatch ? titleMatch[1] : "";
    const combined = `${catText} ${titleText}`;

    if (/sport|football|ligue 1|premier league|bundesliga|champions league|basket|nba|nfl|rugby|top 14|tennis|mma|ufc|boxe|formule 1|moto\s*gp|cyclisme|ski|handball|volley|golf|athl[ée]tisme|natation/i.test(combined)) {
      extraCat = "\n    <category lang=\"en\">Sports</category>";
    } else if (/film|cin[ée]ma|t[ée]l[ée]film|long[- ]m[ée]trage/i.test(catText)) {
      extraCat = "\n    <category lang=\"en\">Movie</category>";
    } else if (/journal|info|m[ée]t[ée]o|d[ée]bat|politique|actualit[ée]s/i.test(catText)) {
      extraCat = "\n    <category lang=\"en\">News</category>";
    }

    if (extraCat) {
      outProgrammes.push(`<programme start="${start}" stop="${stop}" channel="${channelId}">${inner}${extraCat}\n  </programme>`);
    } else {
      outProgrammes.push(fullTag);
    }
  }

  const filteredXml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<tv generator-info-name="tvproxy-filtered">`,
    ...outChannels.map((c) => "  " + c),
    ...outProgrammes.map((p) => "  " + p),
    `</tv>`
  ].join("\n");

  cachedEpg = { xml: filteredXml, logos, exp: Date.now() + 3600_000 };
  console.log(`[tvproxy] Filtered EPG built: ${outChannels.length} channels, ${outProgrammes.length} programmes`);
  return cachedEpg;
}

async function resolveVavooItem(catalogUrl) {
  const sig = await getAddonSignature();
  const urlObj = new URL(catalogUrl);
  const primaryBase = urlObj.origin;
  const secondaryBase = primaryBase === "https://kool.to" ? "https://vavoo.to" : "https://kool.to";
  const bases = [primaryBase, secondaryBase];

  for (const base of bases) {
    try {
      const isSameOrigin = base === primaryBase;
      const targetUrl = isSameOrigin ? catalogUrl : new URL(urlObj.pathname.replace(/^\/[a-z]+-iptv\//, base.includes("kool") ? "/kool-iptv/" : "/vavoo-iptv/") + urlObj.search, base).toString();
      const res = await fetch(`${base}/mediahubmx-resolve.json`, {
        method: "POST",
        headers: getCatalogHeaders(sig),
        body: JSON.stringify({
          language: "de",
          region: "US",
          url: targetUrl,
          clientVersion: "3.0.2"
        }),
        signal: AbortSignal.timeout(3500)
      });
      const body = await res.json();
      const resolved = Array.isArray(body) ? body[0]?.url : (body?.url || body?.streamUrl);
      if (resolved) return resolved;
    } catch (_) {}
  }
  return null;
}

async function fetchHlsPlaylist(streamUrl, timeout = 7000) {
  const res = await fetch(streamUrl, {
    headers: { "User-Agent": "VAVOO/2.6" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeout)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("#EXTM3U")) throw new Error("Not a valid M3U8");
  const finalUrl = res.url || streamUrl;

  if (text.includes("#EXT-X-STREAM-INF")) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("#EXT-X-STREAM-INF") && lines[i + 1] && !lines[i + 1].startsWith("#")) {
        const variantUrl = new URL(lines[i + 1], finalUrl).toString();
        return fetchHlsPlaylist(variantUrl, timeout);
      }
    }
  }

  return { text, finalUrl };
}

function parseSegmentsFromM3u8(playlistUrl, playlistText) {
  const segments = [];
  let seq = 0;
  const seqMatch = playlistText.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/);
  if (seqMatch) seq = Number(seqMatch[1]);

  for (const rawLine of playlistText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const absUrl = new URL(line, playlistUrl).toString();
    segments.push({ seq: seq++, url: absUrl, key: line });
  }
  return segments;
}

async function getCandidateItemsForChannel(channel) {
  const catalog = await getFranceCatalog();
  const candidates = [];
  const seenUrls = new Set();
  for (const pat of channel.patterns) {
    for (const item of catalog) {
      if (pat.test(item.name) && !seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        candidates.push(item);
      }
    }
  }
  return candidates;
}

// Rapid stream discovery using Promise.any: returns as soon as the FIRST candidate succeeds!
async function findWorkingStreamForChannel(channel, excludeUrls = new Set()) {
  const cached = activeStreams.get(channel.slug);
  if (cached && Date.now() < cached.exp && !excludeUrls.has(cached.url)) {
    try {
      const { text, finalUrl } = await fetchHlsPlaylist(cached.url, 4000);
      cached.exp = Date.now() + 180_000;
      return { text, finalUrl, name: cached.name };
    } catch (_) {
      activeStreams.delete(channel.slug);
    }
  }

  const candidates = await getCandidateItemsForChannel(channel);
  for (let i = 0; i < candidates.length; i += 3) {
    const batch = candidates.slice(i, i + 3);
    try {
      const winner = await Promise.any(
        batch.map(async (cand) => {
          const resolvedUrl = await resolveVavooItem(cand.url);
          if (!resolvedUrl || excludeUrls.has(resolvedUrl)) throw new Error("Unresolvable");
          const { text, finalUrl } = await fetchHlsPlaylist(resolvedUrl, 4500);
          if (excludeUrls.has(finalUrl)) throw new Error("Excluded");
          return { text, finalUrl, name: cand.name };
        })
      );
      if (winner) {
        console.log(`[tvproxy] Selected ${winner.name} -> ${new URL(winner.finalUrl).host} for ${channel.slug}`);
        activeStreams.set(channel.slug, { url: winner.finalUrl, name: winner.name, exp: Date.now() + 180_000 });
        return winner;
      }
    } catch (_) {}
  }

  if (Array.isArray(channel.fallbacks)) {
    for (const fbUrl of channel.fallbacks) {
      if (excludeUrls.has(fbUrl)) continue;
      try {
        const { text, finalUrl } = await fetchHlsPlaylist(fbUrl, 5000);
        activeStreams.set(channel.slug, { url: finalUrl, name: "fallback", exp: Date.now() + 180_000 });
        return { text, finalUrl, name: "fallback" };
      } catch (_) {}
    }
  }

  throw new Error(`No working stream found for ${channel.name}`);
}

// Continuous MPEG-TS byte pump: buffer-based downloads (avoids Undici stream pauses) and forward-monotonic timestamps
async function streamContinuousMpegTs(req, res, channel) {
  let closed = false;
  req.on("close", () => { closed = true; });
  res.on("close", () => { closed = true; });

  const excludeUrls = new Set();
  let currentSource = await findWorkingStreamForChannel(channel, excludeUrls);

  res.writeHead(200, {
    "content-type": "video/mp2t",
    "cache-control": "no-cache, no-store",
    "connection": "keep-alive"
  });

  const seenSegments = new Set();
  let isFirstPoll = true;
  let consecutiveErrors = 0;

  while (!closed) {
    try {
      const { text, finalUrl } = isFirstPoll
        ? { text: currentSource.text, finalUrl: currentSource.finalUrl }
        : await fetchHlsPlaylist(currentSource.finalUrl, 8000);

      const allSegs = parseSegmentsFromM3u8(finalUrl, text);
      if (allSegs.length === 0) {
        throw new Error("Empty playlist returned by upstream");
      }

      // Initial buffer: take last 2 segments for 20s initial play cushion.
      // Subsequent polls: only download segments not yet seen.
      let segsToPlay;
      if (isFirstPoll) {
        segsToPlay = allSegs.slice(-2);
        isFirstPoll = false;
      } else {
        segsToPlay = allSegs.filter((s) => !seenSegments.has(s.key));
      }

      let downloadedAny = false;
      for (const seg of segsToPlay) {
        if (closed) break;
        if (seenSegments.has(seg.key)) continue;
        seenSegments.add(seg.key);
        if (seenSegments.size > 200) {
          const oldest = seenSegments.values().next().value;
          seenSegments.delete(oldest);
        }

        const segRes = await fetch(seg.url, {
          headers: { "User-Agent": "VAVOO/2.6" },
          redirect: "follow",
          signal: AbortSignal.timeout(12000)
        });
        if (!segRes.ok) {
          throw new Error(`Segment HTTP ${segRes.status}`);
        }

        // Buffer-based reading: prevents Undici assert(!this.paused) when socket backpressures
        const arrayBuf = await segRes.arrayBuffer();
        if (closed) break;

        const buf = Buffer.from(arrayBuf);
        if (!res.write(buf)) {
          await new Promise((r) => res.once("drain", r));
        }
        downloadedAny = true;
        consecutiveErrors = 0;
      }

      if (closed) break;
      // Pace polling: segments are ~10-12s. Check every 3.5s if data downloaded, 2s if waiting.
      await new Promise((r) => setTimeout(r, downloadedAny ? 3500 : 2000));
    } catch (err) {
      if (closed) break;
      consecutiveErrors++;
      console.warn(`[tvproxy] Stream hiccup on ${channel.slug} (${currentSource.name}, attempt ${consecutiveErrors}/4): ${err.message}`);

      // Failover ONLY after 4 consecutive failures
      if (consecutiveErrors >= 4) {
        excludeUrls.add(currentSource.finalUrl);
        activeStreams.delete(channel.slug);
        try {
          console.log(`[tvproxy] Failing over to next source for ${channel.slug}...`);
          currentSource = await findWorkingStreamForChannel(channel, excludeUrls);
          seenSegments.clear();
          isFirstPoll = false; // Never jump backwards in time on failover
          consecutiveErrors = 0;
          console.log(`[tvproxy] Failover succeeded for ${channel.slug} -> ${currentSource.name}`);
        } catch (failoverErr) {
          console.error(`[tvproxy] All sources exhausted for ${channel.slug}: ${failoverErr.message}`);
          break;
        }
      } else {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  if (!res.writableEnded) res.end();
}

const server = http.createServer(async (req, res) => {
  try {
    req.socket?.setNoDelay(true);
    const reqUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
    const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;

    if (reqUrl.pathname === "/" || reqUrl.pathname === "/status") {
      const catalog = await getFranceCatalog();
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        status: "ok",
        curatedChannels: CHANNELS.length,
        catalogStreams: catalog.length,
        activeStreams: Object.fromEntries([...activeStreams.entries()].map(([k, v]) => [k, { name: v.name, host: new URL(v.url).host }]))
      }, null, 2));
      return;
    }

    if (reqUrl.pathname === "/playlist.m3u" || reqUrl.pathname === "/channels.m3u8") {
      const { logos } = await getFilteredEpg();
      const lines = [`#EXTM3U url-tvg="${baseUrl}/epg.xml"`];
      for (const ch of CHANNELS) {
        const logo = logos.get(ch.tvgId) || "";
        lines.push(
          `#EXTINF:-1 tvg-id="${ch.tvgId}" tvg-chno="${ch.chno}" tvg-name="${ch.name}" tvg-logo="${logo}" group-title="${ch.group}",${ch.name}`,
          `${baseUrl}/live/${ch.slug}.ts`
        );
      }
      res.writeHead(200, {
        "content-type": "audio/x-mpegurl; charset=utf-8",
        "cache-control": "no-cache"
      });
      res.end(lines.join("\n") + "\n");
      return;
    }

    if (reqUrl.pathname === "/epg.xml") {
      const { xml } = await getFilteredEpg();
      res.writeHead(200, {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=1800"
      });
      res.end(xml);
      return;
    }

    const liveMatch = reqUrl.pathname.match(/^\/live\/([a-z0-9-]+?)(?:\.(?:ts|m3u8))?$/i);
    if (liveMatch) {
      const slug = liveMatch[1].toLowerCase();
      const channel = CHANNELS.find((c) => c.slug === slug);
      if (!channel) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("Channel not found");
        return;
      }
      await streamContinuousMpegTs(req, res, channel);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  } catch (err) {
    if (err?.name !== "AbortError") {
      console.error(`[tvproxy] Error on ${req.url}:`, err.message);
    }
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Upstream error: ${err.message}`);
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

server.keepAliveTimeout = 0;
server.headersTimeout = 0;
server.requestTimeout = 0;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[tvproxy] Listening on 0.0.0.0:${PORT} (robust buffered mode with ${CHANNELS.length} channels)`);
  getFranceCatalog().catch(() => {});
  getFilteredEpg().catch(() => {});
});
