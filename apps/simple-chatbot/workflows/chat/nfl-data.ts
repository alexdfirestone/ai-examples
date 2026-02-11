// NFL data files that get written into the sandbox filesystem
export const NFL_FILES: Array<{ path: string; content: string }> = [
  {
    path: "nfl/2024-season-standings.txt",
    content: `NFL 2024-2025 REGULAR SEASON FINAL STANDINGS
=============================================

AFC EAST
--------
Team                W    L   T   PCT    PF    PA
Buffalo Bills      13    4   0  .765   507   329
Miami Dolphins     8     9   0  .471   349   380
New York Jets      5    12   0  .294   291   381
New England Pats   4    13   0  .235   294   418

AFC NORTH
---------
Team                W    L   T   PCT    PF    PA
Baltimore Ravens   12    5   0  .706   483   319
Pittsburgh Steelers 10   7   0  .588   371   334
Cincinnati Bengals  9    8   0  .529   434   399
Cleveland Browns    3   14   0  .176   270   435

AFC SOUTH
---------
Team                W    L   T   PCT    PF    PA
Houston Texans     10    7   0  .588   378   289
Indianapolis Colts  8    9   0  .471   363   366
Jacksonville Jaguars 4  13   0  .235   297   404
Tennessee Titans    3   14   0  .176   259   428

AFC WEST
--------
Team                W    L   T   PCT    PF    PA
Kansas City Chiefs 15    2   0  .882   436   288
Los Angeles Chargers 11  6   0  .647   392   303
Denver Broncos     10    7   0  .588   363   315
Las Vegas Raiders   4   13   0  .235   283   404

NFC EAST
--------
Team                  W    L   T   PCT    PF    PA
Philadelphia Eagles  14    3   0  .824   477   278
Washington Commanders 12   5   0  .706   442   345
Dallas Cowboys        7   10   0  .412   350   387
New York Giants       3   14   0  .176   245   432

NFC NORTH
---------
Team                W    L   T   PCT    PF    PA
Detroit Lions      15    2   0  .882   564   344
Minnesota Vikings  14    3   0  .824   490   331
Green Bay Packers  11    6   0  .647   418   346
Chicago Bears       5   12   0  .294   290   402

NFC SOUTH
---------
Team                W    L   T   PCT    PF    PA
Tampa Bay Bucs     10    7   0  .588   425   358
Atlanta Falcons     8    9   0  .471   373   378
Carolina Panthers   5   12   0  .294   306   413
New Orleans Saints  5   12   0  .294   325   423

NFC WEST
--------
Team                   W    L   T   PCT    PF    PA
Los Angeles Rams      10    7   0  .588   402   339
Minnesota Vikings     14    3   0  .824   490   331
Seattle Seahawks      10    7   0  .588   389   374
Arizona Cardinals      8    9   0  .471   383   404
San Francisco 49ers    6   11   0  .353   338   385
`,
  },
  {
    path: "nfl/super-bowl-lix.txt",
    content: `SUPER BOWL LIX RECAP
====================
Date: February 9, 2025
Venue: Caesars Superdome, New Orleans, Louisiana

FINAL SCORE
-----------
Philadelphia Eagles  40
Kansas City Chiefs   22

QUARTER-BY-QUARTER
------------------
           Q1   Q2   Q3   Q4   FINAL
PHI         3   21   10    6     40
KC          6    3   10    3     22

MVP: Saquon Barkley, RB - Philadelphia Eagles
  - 23 carries, 167 rushing yards, 2 TDs
  - 3 receptions, 45 receiving yards

KEY STATS
---------
Eagles:
  Jalen Hurts: 20/32, 283 yards, 2 TD, 0 INT; 12 rushes, 53 yards, 1 TD
  Saquon Barkley: 23 carries, 167 yards, 2 TD; 3 rec, 45 yards
  A.J. Brown: 7 rec, 120 yards, 1 TD
  DeVonta Smith: 6 rec, 84 yards, 1 TD
  Total yards: 498
  Time of possession: 34:12

Chiefs:
  Patrick Mahomes: 26/41, 268 yards, 2 TD, 2 INT
  Isiah Pacheco: 14 carries, 68 yards, 0 TD
  Travis Kelce: 8 rec, 82 yards, 1 TD
  Xavier Worthy: 5 rec, 61 yards, 1 TD
  Total yards: 389
  Time of possession: 25:48

GAME NARRATIVE
--------------
The Eagles dominated from the second quarter onward, with Saquon Barkley
delivering a historic rushing performance. Philadelphia's defense forced
two interceptions from Patrick Mahomes — a rare feat in a Super Bowl.
The Eagles avenged their Super Bowl LVII loss to the Chiefs and secured
the franchise's second Super Bowl title (first was Super Bowl LII in 2018).

RECORDS SET
-----------
- Saquon Barkley: Most rushing yards in a Super Bowl (167)
- Eagles: Largest margin of victory over the Chiefs in a Super Bowl
- Eagles: Most points scored against Chiefs in a Super Bowl
`,
  },
  {
    path: "nfl/playoff-bracket-2025.txt",
    content: `NFL 2024-2025 PLAYOFF BRACKET
==============================

AFC WILD CARD ROUND
-------------------
(4) Houston Texans 32 vs (5) Los Angeles Chargers 12
(3) Baltimore Ravens 28 vs (6) Pittsburgh Steelers 14
(2) Buffalo Bills 31 vs (7) Denver Broncos 7

AFC DIVISIONAL ROUND
--------------------
(1) Kansas City Chiefs 23 vs (4) Houston Texans 14
(2) Buffalo Bills 27 vs (3) Baltimore Ravens 25

AFC CHAMPIONSHIP
----------------
(1) Kansas City Chiefs 32 vs (2) Buffalo Bills 29

---

NFC WILD CARD ROUND
-------------------
(4) Tampa Bay Buccaneers 23 vs (5) Washington Commanders 37
(3) Los Angeles Rams 27 vs (6) Minnesota Vikings 9
(2) Philadelphia Eagles 22 vs (7) Green Bay Packers 10

NFC DIVISIONAL ROUND
--------------------
(1) Detroit Lions 31 vs (5) Washington Commanders 45
(2) Philadelphia Eagles 28 vs (3) Los Angeles Rams 22

NFC CHAMPIONSHIP
----------------
(5) Washington Commanders 36 vs (2) Philadelphia Eagles 55

---

SUPER BOWL LIX
---------------
(1 AFC) Kansas City Chiefs 22 vs (2 NFC) Philadelphia Eagles 40

Champion: Philadelphia Eagles
MVP: Saquon Barkley
`,
  },
  {
    path: "nfl/top-performers-2024.txt",
    content: `NFL 2024 SEASON - TOP PERFORMERS
=================================

PASSING YARDS
-------------
1. Joe Burrow (CIN)        4,918 yards   43 TD  9 INT
2. Lamar Jackson (BAL)     4,172 yards   41 TD  4 INT
3. Jared Goff (DET)        4,629 yards   37 TD  12 INT
4. Josh Allen (BUF)        3,731 yards   28 TD  6 INT
5. Jalen Hurts (PHI)       3,858 yards   25 TD  8 INT

RUSHING YARDS
-------------
1. Saquon Barkley (PHI)    2,005 yards   13 TD   4.8 avg
2. Derrick Henry (BAL)     1,921 yards   16 TD   5.0 avg
3. Josh Jacobs (GB)        1,329 yards   15 TD   4.4 avg
4. Jahmyr Gibbs (DET)      1,412 yards   16 TD   5.5 avg
5. Bijan Robinson (ATL)    1,456 yards   11 TD   4.9 avg

RECEIVING YARDS
---------------
1. Ja'Marr Chase (CIN)     1,708 yards   17 TD   117 rec
2. Amon-Ra St. Brown (DET) 1,263 yards    8 TD   115 rec
3. Terry McLaurin (WAS)    1,096 yards   13 TD    82 rec
4. A.J. Brown (PHI)        1,079 yards    7 TD    67 rec
5. Malik Nabers (NYG)      1,204 yards    7 TD   109 rec

SACKS
-----
1. Trey Hendrickson (CIN)      17.5
2. Myles Garrett (CLE)         14.0
3. Nik Bonitto (DEN)           12.5
4. Josh Hines-Allen (JAX)      11.5
5. Micah Parsons (DAL)         12.0

INTERCEPTIONS
-------------
1. Kerby Joseph (DET)            9
2. Marlon Humphrey (BAL)         6
3. Quinyon Mitchell (PHI)        6
4. Xavier McKinney (GB)          8
5. Beanie Bishop Jr. (PIT)       6

AWARDS
------
MVP: Lamar Jackson, QB, Baltimore Ravens
OPOY: Saquon Barkley, RB, Philadelphia Eagles
DPOY: Trey Hendrickson, DE, Cincinnati Bengals
OROY: Jayden Daniels, QB, Washington Commanders
DROY: Jared Verse, LB, Los Angeles Rams
Coach of the Year: Dan Quinn, Washington Commanders
`,
  },
  {
    path: "nfl/README.txt",
    content: `NFL DATA DIRECTORY
==================

This directory contains NFL 2024-2025 season data files.

Available files:
  2024-season-standings.txt  - Final regular season standings by division
  super-bowl-lix.txt         - Super Bowl LIX full recap and stats
  playoff-bracket-2025.txt   - Complete 2024-2025 playoff bracket and results
  top-performers-2024.txt    - Season stat leaders and award winners

Use bash commands to explore:
  ls nfl/                         - List all files
  cat nfl/README.txt              - Read this file
  cat nfl/super-bowl-lix.txt      - Read Super Bowl recap
  grep "Eagles" nfl/*.txt         - Search across all files
  grep -i "touchdown" nfl/*.txt   - Case-insensitive search
`,
  },
];
