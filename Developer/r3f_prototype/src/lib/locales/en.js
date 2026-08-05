// English strings. Keys mirror ko.js plus the game-data keys whose Korean source
// lives in the data files (weapon catalog, quests, investigation lines, legal docs).
const SERVICE_NAME = 'Escape! Zombie School'
const CONTACT_EMAIL = 'zard5388@gmail.com'
const EFFECTIVE_DATE = 'July 29, 2026'

export default {
  // ─── Common ───
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.retry': 'Retry',
  'common.back': 'Back',
  'common.done': 'Done',
  'common.max': 'Max',
  'common.locked': 'Locked',
  'common.unlocked': 'Unlocked',
  'common.notEnoughCoins': 'Not enough coins',
  'common.coinPrice': '{price} coins',
  'common.ownedCoins': 'Coins',

  // ─── Title ───
  'title.serviceName': 'Escape! Zombie School',
  'title.wordAccent': 'ESCAPE!',
  'title.wordSchool': 'ZOMBIE SCHOOL',
  'title.fontSize': 'clamp(25px, 7.6vw, 38px)',
  'title.subtitle': 'Escape through the exit that opens after 3:30',
  'title.gameplayGuide': 'Auto-attack · Drag to move · Pick a card on level up',
  'title.start': 'START GAME',
  'title.studioError': 'Could not load graphics data. Check your connection and try again.',
  'title.progressError': 'Something went wrong loading your account progress. Check your connection and try again.',
  'title.cheatToast': 'Cheats are now visible',
  'title.cheatButton': 'Cheat',
  'title.cheatOpenAria': 'Open cheat menu',
  'title.cheatCloseAria': 'Close cheat menu backdrop',
  'title.cheatHeading': 'Cheat Menu',
  'title.devSection': 'Dev tools',
  'title.unlockWeapons': 'Unlock all weapons',
  'title.unlockStages': 'Unlock all stages',
  'title.resetPassives': 'Reset coin upgrades',
  'title.nicknameCloseAria': 'Close nickname input backdrop',
  'title.nicknameHeading': 'Set Nickname',
  'title.nicknameLabel': 'Nickname',
  'title.nicknameHint': 'While signed in with Google, this nickname is saved with your account progress.',
  'title.nicknameSubmit': 'Save and start',

  // ─── Lobby ───
  'lobby.player': 'PLAYER',
  'lobby.noName': 'Nameless Survivor',
  'lobby.openSettings': 'Open settings',
  'lobby.season': 'SEASON',
  'lobby.seasonPreparing': 'Season starting soon',
  'lobby.seasonAlways': 'Always on',
  'lobby.seasonEndingSoon': 'Ending soon',
  'lobby.seasonEndsDays': 'Ends in {days}d {hours}h',
  'lobby.seasonEndsHours': 'Ends in {hours}h {minutes}m',
  'lobby.stageListAria': 'Stage list',
  'lobby.menuAria': 'Lobby menu',
  'lobby.weapons': 'Weapons',
  'lobby.ranking': 'Ranking',
  'lobby.shop': 'Shop',
  'lobby.cleared': 'CLEARED',
  'lobby.bestRecord': 'Best: {value}',
  'lobby.noRecord': 'No record',
  'lobby.enter': 'ENTER',
  'lobby.scoreRecord': 'Score board',
  'lobby.comingSoon': 'Coming soon',
  'lobby.lockedDefault': 'Clear the previous stage to unlock',
  'lobby.unlock.stage2': 'Unlocks after clearing Stage 1',
  'lobby.unlock.stage4': 'Unlocks after clearing Stage 3',
  'lobby.bossPreviewAria': '{stage} boss in 3D',
  'lobby.lockPreviewAria': '{stage} locked 3D padlock',
  'lobby.showtime.B01': 'CHARGE!',
  'lobby.showtime.B02': 'TEACHER SWING!',
  'lobby.showtime.B03': 'MUSCLE POSE!',

  // ─── Settings ───
  'settings.title': 'Settings',
  'settings.closeBackdropAria': 'Close settings backdrop',
  'settings.profile': 'PROFILE',
  'settings.nickname': 'Nickname',
  'settings.notSet': 'Not set',
  'settings.nicknameLabel': 'Nickname',
  'settings.nicknameHint': 'Your nickname is shown on rankings and with your account progress.',
  'settings.gameEnv': 'GAME',
  'settings.language': 'Language',
  'settings.languageDesc': 'Display language for all in-game text',
  'settings.languageAria': 'Select language',
  'settings.vibration': 'Vibration',
  'settings.vibrationDesc': 'Haptic feedback on hits and rewards',
  'settings.vibrationOn': 'Turn vibration on',
  'settings.vibrationOff': 'Turn vibration off',
  'settings.reducedEffects': 'Reduce effects',
  'settings.reducedEffectsDesc': 'Softens heavy shadows and light bloom',
  'settings.reducedEffectsOn': 'Turn reduced effects on',
  'settings.reducedEffectsOff': 'Turn reduced effects off',
  'settings.hitShake': 'Hit camera shake',
  'settings.hitShakeDesc': 'Short shake when a zombie is hit, for impact',
  'settings.hitShakeOn': 'Turn hit camera shake on',
  'settings.hitShakeOff': 'Turn hit camera shake off',
  'settings.help': 'HELP',
  'settings.controls': 'How to play',
  'settings.controlsDesc': 'Movement, level-up cards, pausing',
  'settings.control1': 'Mobile: move with the joystick at the bottom of the screen.',
  'settings.control2': 'Level up: tap a card to pick a weapon or passive.',
  'settings.control3': 'Pause: use the pause button on the combat screen.',
  'settings.legal': 'LEGAL',
  'settings.viewFull': 'Read in full',
  'settings.account': 'ACCOUNT',
  'settings.logout': 'Sign out',
  'settings.deleteAccount': 'Delete account',
  'settings.deleteHeading': 'Delete your account?',
  'settings.deleteWarning': 'Your progress, gold, permanent weapon upgrades and ranking records will be permanently deleted and cannot be restored.',
  'settings.deleting': 'Deleting...',
  'settings.deletePermanent': 'Delete permanently',
  'settings.reauthBusy': 'Re-authenticating...',
  'settings.reauthRetry': 'Sign in again and retry',
  'settings.err.reauthRequired': 'For security, sign in again before deleting your account.',
  'settings.err.unauthenticated': 'Your sign-in session expired. Please sign in again and retry.',
  'settings.err.network': 'Deletion failed due to a network error. Check your connection and try again.',
  'settings.err.progressDeleteFailed': 'Failed to delete your progress. Please try again in a moment.',
  'settings.err.unknown': 'Deletion failed due to an unknown error. Please try again in a moment.',
  'settings.err.reauthFailed': 'Re-authentication failed. Please sign in again and retry.',

  // ─── Nickname validation ───
  'nickname.tooShort': 'Please use at least 2 characters.',
  'nickname.tooLong': 'Please use 12 characters or fewer.',

  // ─── Consent gate ───
  'consent.heading': 'Terms of Service & Privacy Policy',
  'consent.cancelAria': 'Cancel and close',
  'consent.intro': 'To play {service}, please agree to each item below. This is asked only once and will not be asked again until you delete your account.',
  'consent.acceptAll': 'Agree to all',
  'consent.collapse': 'Collapse',
  'consent.expand': 'Read full text',
  'consent.helper': 'You must agree to both items to start.',
  'consent.submitting': 'Confirming...',
  'consent.submit': 'Agree and start',
  'consent.saveFailed': 'Failed to save your consent. Check your connection and try again.',
  'consent.saveError': 'Something went wrong while saving your consent. Please try again.',
  'consent.item.terms': 'I agree to the Terms of Service. (required)',
  'consent.item.privacy': 'I have read and agree to the Privacy Policy. (required)',

  // ─── Account panel ───
  'account.google': 'Google account',
  'account.linked': 'Account linked',
  'account.master': 'Owner',
  'account.logout': 'Sign out',
  'account.signingIn': 'Signing in...',
  'account.signIn': 'Sign in with Google',
  'account.status.signingIn': 'Signing in with Google',
  'account.status.unconfigured': 'Google sign-in setup required',
  'account.status.checking': 'Checking saved sign-in',
  'account.status.error': 'Sign-in error',
  'account.status.ready': 'Ready to link account',
  'account.detail.unconfigured': 'Firebase .env setup required',
  'account.detail.checking': 'Checking saved sign-in',
  'account.detail.error': 'Please try again',
  'account.detail.ready': 'Ready to save progress to the cloud',

  // ─── App bootstrap / loading ───
  'app.checkingAuth': 'Checking your Google sign-in status.',
  'app.authFailed': 'Could not verify your Google sign-in. Please sign in again.',
  'app.authUnconfigured': 'Firebase Google sign-in setup is required.',
  'app.adminGoogleOnly': 'Admin tools are only accessible with an existing Google sign-in.',
  'app.adminDeniedReason': 'This Google account does not have owner permissions.',
  'app.adminDeniedTitle': 'Admin access denied',
  'app.studioNeedsSignIn': 'Firebase Studio data loads after Google sign-in.',
  'app.studioLoading': 'Loading Firebase Studio data.',
  'app.studioFailed': 'Could not load Firebase Studio data. Check your sign-in status and connection.',
  'loading.studio': 'Loading Graphics Studio…',
  'loading.admin': 'Loading admin tools…',
  'loading.shop': 'Loading shop…',
  'loading.ranking': 'Loading ranking…',
  'loading.game': 'Loading game…',
  'back.toResult': 'Back to results',
  'back.toLobby': 'Back to lobby',
  'back.toTitle': 'Back to title',

  // ─── Ranking ───
  'ranking.stageTitle': 'Stage Ranking',
  'ranking.todayFirst': "Today's #1",
  'ranking.dailyWindow': 'KST 00:00:01 - 23:59:59 today, updated live',
  'ranking.dailyBoardAria': '{stage} daily ranking',
  'ranking.waiting': 'Waiting for records',
  'ranking.anonymous': 'Anonymous',
  'ranking.anonymousSurvivor': 'Anonymous Survivor',
  'ranking.myRecord': 'My record',
  'ranking.defaultSeason': 'Always-on Season',
  'ranking.rankSuffix': '#{rank}',
  'ranking.scoreSuffix': '{score} pts',
  'ranking.clearedSuffix': ' · Cleared',
  'ranking.globalTitle': 'Global Ranking',
  'ranking.myRuns': 'My runs',
  'ranking.myRunsUnit': '',
  'ranking.myBest': 'My season best',
  'ranking.tabsAria': 'Global ranking tabs',
  'ranking.colRank': 'Rank',
  'ranking.colUser': 'Player',
  'ranking.colScore': 'Score',
  'ranking.listAria': 'Player ranking, #1 through #{limit}',
  'ranking.goBack': 'Back',
  'ranking.noRecord': 'No record',
  'ranking.tab.daily': 'Daily',
  'ranking.tab.dailyNote': 'Best score, KST 00:00:01 - 23:59:59 today',
  'ranking.tab.weekly': 'Weekly',
  'ranking.tab.weeklyNote': 'Best score, KST Mon 00:00:01 - Sun 23:59:59',

  // ─── Shop / weapons / abilities ───
  'shop.eyebrow': 'SURVIVAL UPGRADE FORM',
  'shop.title': 'Coin Shop',
  'shop.tabsAria': 'Coin shop tabs',
  'shop.tabHero': 'Hero upgrades',
  'shop.tabWeapon': 'Weapon upgrades',
  'shop.permanentNotice': 'Permanent weapon base upgrades',
  'shop.upgrade': 'Upgrade',
  'shop.buy': 'Buy',
  'shop.applyNumber': 'FORM {number}',
  'shop.progress': 'Progress',
  'shop.progressAria': '{name} progress {current}/{max}',
  'shop.iconAria': '{name} icon',
  'shop.currentIs': 'Now: {value}',
  'shop.currentBase': 'Now: base stats',
  'shop.nextIs': 'Next: {value}',
  'shop.needUnlock': 'Unlock the weapon to upgrade',
  'shop.allPermanentDone': 'All permanent upgrades done',
  'shop.upgradeDirection': 'Upgrade path: {value}',
  'shop.checkAfterUnlock': 'view after unlocking',
  'ability.title': 'My Stats',
  'ability.closeAria': 'Close stats backdrop',
  'weaponModal.closeAria': 'Close weapon status backdrop',
  'weaponModal.eyebrow': 'ARMORY',
  'weaponModal.title': 'Weapon Unlocks',
  'weaponModal.countLabel': 'unlocked',
  'weaponModal.listAria': 'Weapon list',
  'weaponModal.starter': 'Starter weapon',
  'weaponModal.unlockDone': 'Unlocked',
  'weaponModal.anyCondition': 'Unlocks when any one condition is met',
  'cond.totalRuns': 'Total runs',
  'cond.totalKills': 'Total kills',
  'cond.totalGold': 'Total coins',
  'cond.totalSurvivalSeconds': 'Total survival',
  'cond.stage1Clears': 'Stage 1 clears',
  'cond.stage2Clears': 'Stage 2 clears',
  'cond.stage1Survival180Runs': 'Stage 1 3-min survivals',
  'cond.runKills': 'Kills in one run',
  'cond.runSurvivalSeconds': 'Survival in one run',
  'cond.runGold': 'Coins in one run',
  'cond.unit.times': 'x',
  'cond.unit.seconds': 's',

  // ─── HUD ───
  'hud.matildaName': 'Matilda',
  'hud.matildaLine': 'Ohohoho! Give me a rice cake and I won’t eat you!',
  'hud.matildaDeathLine': 'Ohohoho!!!!! You look delicious!!!!',
  'hud.matildaGameoverLine': 'Matilda took your soul!!',
  'hud.matildaWarning': '⚠ Reaper Matilda has appeared',
  'hud.matildaDialogueAria': 'Matilda entrance line',
  'hud.matildaPortraitAlt': 'Matilda portrait',
  'hud.bossWarning': 'BOSS INCOMING',
  'hud.projectileWarning': 'Watch the corridor shots',
  'hud.portalAppeared': 'The exit has appeared!',
  'hud.portalDistance': 'Exit {arrow} {distance}zm',
  'hud.portalMoveAria': 'Move to the exit',
  'hud.milestoneGold': '+{gold} gold',
  'hud.pauseAria': 'Pause game',
  'hud.resumeAria': 'Resume game',
  'hud.questBagOpenAria': 'Open quest bag',
  'hud.questBagCloseAria': 'Close quest bag',
  'hud.newQuestItemAria': 'New quest item',
  'hud.levelUp': 'LEVEL UP! Lv.{level}',
  'hud.survivalTime': 'Survival time: {time}',
  'hud.clearTime': 'Clear time: {time}',
  'hud.goldEarned': 'Gold earned: {session} (total {total})',
  'hud.newWeaponUnlocked': '🎉 New weapon unlocked!',
  'hud.newWeaponHint': 'It will show up on cards from your next run',
  'hud.nextUnlockLabel': 'Next weapon to meet',
  'hud.nextUnlockHint': 'Available at Lv.{level}',
  'hud.bossBonus': 'Boss defeat bonus: ',
  'hud.bossBonusPoints': '+{points} pts',
  'hud.restart': 'Retry',
  'hud.restartSpaced': 'Retry',
  'hud.toTitle': 'Title',
  'hud.coinShop': 'Coin shop',
  'hud.ranking': 'Ranking',
  'hud.rankingTrophy': '🏆 Ranking',
  'hud.nextStage': 'Next stage',
  'hud.questBagTitle': 'Quest Bag',
  'hud.questBagCloseLabel': 'Close quest bag',
  'hud.questSummary': 'Active {active} · Items {items}',
  'hud.questEmpty': 'You have no quests yet.',
  'hud.questEmptyHint': 'Try investigating students who need help.',
  'hud.questCompleted': 'Completed',
  'hud.questCompleteMark': 'Completed',
  'hud.questFindItem': 'Find the item',
  'hud.questInstall': 'Install at the fixture',
  'hud.questReturn': 'Return to the student',
  'hud.questReward': 'Reward {gold}G',
  'hud.questItemsAria': 'Quest items',
  'hud.questItemHeading': 'Quest items',
  'hud.questToastItem': 'Stored in your bag: {item}',
  'hud.questToastDone': '{title} complete! Reward {gold}G',
  'hud.questToastStart': 'Quest accepted: {title}',
  'hud.confirmLobbyAria': 'Confirm return to lobby',
  'hud.pauseTitleAria': 'Paused',
  'hud.confirmLobbyHeading': 'Return to the lobby?',
  'hud.confirmLobbyBody': 'Your current survival score will be recorded on the ranking.',
  'hud.goBack': 'Return',
  'hud.awayTitle': 'You stepped away',
  'hud.pausedTitle': 'PAUSED',
  'hud.awayBody': 'You can pick up right where you left off.',
  'hud.resumeAway': 'Continue',
  'hud.resume': 'Resume',
  'hud.backToLobby': 'Back to lobby',
  'hud.investigateAria': 'Investigate {name}',
  'hud.laidStudentAlt': 'Collapsed student portrait',
  'hud.defaultSubject': 'Target',
  'hud.tiredStudent': 'Exhausted Student',
  'hud.rewardGold': 'Investigation reward: {amount} gold',
  'hud.rewardUpgrade': 'Investigation reward: an upgrade pick',
  'hud.tapToContinue': 'Tap the screen to continue',
  'hud.tapToStart': 'Tap the screen to start',
  'hud.introAria': 'Story intro',
  'hud.allWeapons': 'All weapons',
  'hud.weaponCheat': 'Weapon cheat',
  'hud.summonMatilda': 'Summon Matilda',
  'hud.starlinkCheatAria': 'Starlink crash cheat',
  'hud.starlinkCheatTitle': 'Crash Starlink now',
  'hud.copyLog': 'Copy dev log',
  'hud.copyLogDone': 'Dev log copied',
  'hud.copyLogFail': 'Dev log copy failed',

  // ─── Stage 1 story intro ───
  'intro.stage1.0': 'The hearts of students who hated studying turned them into zombies…',
  'intro.stage1.1': 'And the teachers who hated working turned too.',
  'intro.stage1.2': 'I have to get out of here. This place is… a zombie school!',

  // ─── Stages ───
  'stage.stage1.title': 'Classroom Survival',
  'stage.stage2.title': 'Corridor Projectile Test',
  'stage.stage3.title': 'Gymnasium All-Out War',
  'stage.stage4.title': 'Cafeteria Breakout',
  'stage.description': 'Escape through the exit that opens after 3:30',
  'milestone.초반 생존 보너스': 'Early survival bonus',
  'milestone.중반 돌파 보너스': 'Midgame breakthrough bonus',
  'milestone.보스 조우 보너스': 'Boss encounter bonus',
  'milestone.학교 탈출 보너스': 'School escape bonus',
  'milestone.복도 적응 보너스': 'Corridor adaptation bonus',
  'milestone.탄환 회피 보너스': 'Projectile dodge bonus',
  'milestone.복도 보스 조우 보너스': 'Corridor boss encounter bonus',
  'milestone.복도 탈출 보너스': 'Corridor escape bonus',
  'milestone.아레나 적응 보너스': 'Arena adaptation bonus',
  'milestone.3축 돌파 보너스': 'Three-axis breakthrough bonus',
  'milestone.체육교사 조우 보너스': 'PE teacher encounter bonus',
  'milestone.총력전 탈출 보너스': 'All-out war escape bonus',
  'milestone.배식 개시 보너스': 'Serving start bonus',
  'milestone.급식실 돌파 보너스': 'Cafeteria breakthrough bonus',
  'milestone.주방장 조우 보너스': 'Head chef encounter bonus',
  'milestone.급식실 탈출 보너스': 'Cafeteria escape bonus',

  // ─── Weapon names ───
  'weapon.pencilThrow': 'Pencil',
  'weapon.schoolBag': '30cm Ruler',
  'weapon.boxCutter': 'Box Cutter',
  'weapon.tumbler': 'Tumbler',
  'weapon.scienceFlask': 'Science Flask',
  'weapon.bell': 'Bell',
  'weapon.stunGun': 'Stun Gun',
  'weapon.onigiri': 'Onigiri',
  'weapon.chibiko': 'Chibiko',
  'weapon.guidedMissile': 'Power Bank Missile',
  'weapon.sharkMissile': 'Shark Missile',
  'weapon.starlink': 'Broken Starlink',
  'weapon.compassBlade': 'Compass Blade',
  'weapon.umbrellaGuard': 'Umbrella Guard',
  'weapon.eraserBomb': 'Eraser Bomb',
  'weapon.studentLantern': 'Student Lantern',

  // ─── Passive names ───
  'passive.magnet': 'Pickup Radius',
  'passive.moveSpeed': 'Move Speed',
  'passive.maxHp': 'Health',
  'passive.might': 'Might',
  'passive.growth': 'Growth',
  'passive.armor': 'Armor',
  'passive.cooldown': 'Cooldown',
  'passive.greed': 'Greed',

  // ─── Permanent upgrade stat phrases ───
  'perm.공격력': 'Attack',
  'perm.공격 범위': 'Attack range',
  'perm.쿨타임': 'Cooldown',
  'perm.접촉 피해': 'Contact damage',
  'perm.화학 웅덩이 지속시간': 'Chemical pool duration',
  'perm.피해': 'Damage',
  'perm.투사체 속도': 'Projectile speed',
  'perm.폭발 피해': 'Explosion damage',
  'perm.귀소 속도': 'Homing speed',
  'perm.타격 피해': 'Strike damage',
  'perm.칼날 피해': 'Blade damage',
  'perm.넉백': 'Knockback',
  'perm.폭발 범위': 'Explosion radius',
  'perm.빛 콘 길이': 'Light cone length',
  'perm.치명타 확률': 'Crit chance',
  'perm.기본 투사체 수': 'Base projectile count',
  'perm.휘두르기 판정 유지시간': 'Swing hitbox duration',
  'perm.일정 확률로 추가 절단 1회': 'Chance for one extra slash',
  'perm.회전 속도': 'Orbit speed',
  'perm.기본 궤도체 수': 'Base orbiter count',
  'perm.웅덩이 범위': 'Pool radius',
  'perm.웅덩이 지속시간 추가': 'Extra pool duration',
  'perm.파동 크기': 'Wave size',
  'perm.파동 도달거리': 'Wave reach',
  'perm.체인 수': 'Chain count',
  'perm.짧은 경직 확률': 'Brief stagger chance',
  'perm.바운스 횟수': 'Bounce count',
  'perm.바운스 횟수 추가': 'Extra bounce count',
  'perm.동료 공격 주기': 'Companion attack interval',
  'perm.모든 무기 능력 보너스': 'All-weapon stat bonus',
  'perm.동료 피해': 'Companion damage',
  'perm.치비코 투척체': 'Chibiko projectile',
  'perm.유도 회전력': 'Guidance turn rate',
  'perm.귀소 전환 시간': 'Homing switch time',
  'perm.타격 반경': 'Strike radius',
  'perm.추가 소형 낙하 타격 확률': 'Extra small strike chance',
  'perm.스택 폭발 범위': 'Stack explosion radius',
  'perm.펄스 범위': 'Pulse radius',
  'perm.펄스 쿨타임': 'Pulse cooldown',
  'perm.폭발 후 짧은 둔화 장판 생성': 'Leaves a brief slow field after exploding',
  'perm.빛 콘 각도': 'Light cone angle',
  'perm.빛에 맞은 적 둔화 확률': 'Slow chance on lit enemies',

  // ─── Level-up cards ───
  'up.unlockWord': 'unlock',
  'up.acquireWord': 'acquire',
  'up.acquireLabel': 'Acquire {weapon}',
  'up.acquireBoxCutter.label': 'Unlock Box Cutter',
  'up.acquireBoxCutter.desc': 'Stabs a narrow area ahead, then slashes sideways',
  'up.boxCutterDamage.label': 'Box Cutter damage +{amount} (Lv{level})',
  'up.boxCutterDamage.desc': 'Increases stab damage',
  'up.boxCutterRange.label': 'Box Cutter range +',
  'up.boxCutterRange.desc': 'Increases forward stab range',
  'up.boxCutterCrit.label': 'Box Cutter crit up',
  'up.boxCutterCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.pencilDamage.label': 'Pencil damage +{amount} (Lv{level})',
  'up.pencilDamage.desc': 'Increases thrown pencil attack power',
  'up.pencilCount.label': 'Pencil count +1',
  'up.pencilCount.desc': 'More pencils thrown at once (max 4)',
  'up.pencilPierce.label': 'Pencil pierce +1',
  'up.pencilPierce.desc': 'Pencils pierce enemies (max 3)',
  'up.pencilCrit.label': 'Pencil crit up',
  'up.pencilCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireBag.label': 'Unlock 30cm Ruler',
  'up.acquireBag.desc': 'Defends by swinging the ruler at nearby enemies',
  'up.bagDamage.label': '30cm Ruler damage +{amount} (Lv{level})',
  'up.bagDamage.desc': 'Increases ruler swing damage',
  'up.bagRadius.label': '30cm Ruler range +',
  'up.bagRadius.desc': 'Increases ruler swing area',
  'up.bagCrit.label': '30cm Ruler crit up',
  'up.bagCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireTumbler.label': 'Unlock Tumbler',
  'up.acquireTumbler.desc': 'A guard weapon that orbits the player',
  'up.tumblerCount.label': 'Tumbler count +1',
  'up.tumblerCount.desc': 'More orbiting tumblers (max 3)',
  'up.tumblerDamage.label': 'Tumbler damage +{amount} (Lv{level})',
  'up.tumblerDamage.desc': 'Increases orbiting tumbler contact damage',
  'up.tumblerCrit.label': 'Tumbler crit up',
  'up.tumblerCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireFlask.label': 'Unlock Flask',
  'up.acquireFlask.desc': 'Throws an area explosion into packed enemies',
  'up.flaskDamage.label': 'Flask damage +{amount} (Lv{level})',
  'up.flaskDamage.desc': 'Increases explosion damage',
  'up.flaskRadius.label': 'Flask radius +',
  'up.flaskRadius.desc': 'Increases explosion radius',
  'up.flaskCrit.label': 'Flask crit up',
  'up.flaskCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5), pool duration +1s',
  'up.acquireBell.label': 'Unlock Bell',
  'up.acquireBell.desc': 'Unlocks the 8-way shockwave skill',
  'up.bellDamage.label': 'Bell damage +{amount} (Lv{level})',
  'up.bellDamage.desc': 'Increases shockwave attack power',
  'up.bellCrit.label': 'Bell crit up',
  'up.bellCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireStun.label': 'Unlock Stun Gun',
  'up.acquireStun.desc': 'Unlocks the chain stun gun skill',
  'up.stunDamage.label': 'Stun damage +{amount} (Lv{level})',
  'up.stunDamage.desc': 'Increases chain stun damage',
  'up.stunChain.label': 'Stun chain +1',
  'up.stunChain.desc': 'More chain targets (max 4)',
  'up.stunCrit.label': 'Stun Gun crit up',
  'up.stunCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireOnigiri.label': 'Unlock Onigiri',
  'up.acquireOnigiri.desc': 'A rice ball that bounces between enemies',
  'up.onigiiriBounce.label': 'Onigiri bounce +1',
  'up.onigiiriBounce.desc': 'More bounces (max 10)',
  'up.onigiiriDamage.label': 'Onigiri damage +{amount} (Lv{level})',
  'up.onigiiriDamage.desc': 'Increases impact damage',
  'up.onigiiriCrit.label': 'Onigiri crit up',
  'up.onigiiriCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireMissile.label': 'Unlock Power Bank Missile',
  'up.acquireMissile.desc': 'Clears distant packs with a homing explosion',
  'up.missileDamage.label': 'Missile damage +{amount} (Lv{level})',
  'up.missileDamage.desc': 'Increases explosion damage',
  'up.missileRadius.label': 'Missile radius +',
  'up.missileRadius.desc': 'Increases explosion radius (max 2.2)',
  'up.acquireStarlink.label': 'Unlock Broken Starlink',
  'up.acquireStarlink.desc': 'Random lightning strikes nearby',
  'up.starlinkDamage.label': 'Lightning damage +{amount} (Lv{level})',
  'up.starlinkDamage.desc': 'Increases damage per strike',
  'up.starlinkCount.label': 'Lightning count +1',
  'up.starlinkCount.desc': 'More simultaneous strikes (max 3)',
  'up.starlinkCrit.label': 'Lightning crit up',
  'up.starlinkCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireCompassBlade.label': 'Unlock Compass Blade',
  'up.acquireCompassBlade.desc': 'A compass blade that circles the player',
  'up.compassBladeDamage.label': 'Compass Blade damage +{amount} (Lv{level})',
  'up.compassBladeDamage.desc': 'Increases orbiting blade damage',
  'up.compassBladeCount.label': 'Compass Blade count +1',
  'up.compassBladeCount.desc': 'More orbiting blades (max 3)',
  'up.compassBladeCrit.label': 'Compass Blade crit up',
  'up.compassBladeCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireUmbrellaGuard.label': 'Unlock Umbrella Guard',
  'up.acquireUmbrellaGuard.desc': 'An open umbrella spins, then explodes',
  'up.umbrellaDamage.label': 'Umbrella blast damage +{amount} (Lv{level})',
  'up.umbrellaDamage.desc': 'Increases the final explosion damage',
  'up.umbrellaRadius.label': 'Umbrella blast radius +',
  'up.umbrellaRadius.desc': 'Increases explosion radius',
  'up.acquireEraserBomb.label': 'Unlock Eraser Bomb',
  'up.acquireEraserBomb.desc': 'A slow but heavy area explosion',
  'up.eraserDamage.label': 'Bomb damage +{amount} (Lv{level})',
  'up.eraserDamage.desc': 'Increases explosion damage',
  'up.eraserRadius.label': 'Bomb radius +',
  'up.eraserRadius.desc': 'Increases explosion radius',
  'up.acquireLantern.label': 'Unlock Student Lantern',
  'up.acquireLantern.desc': 'Lights the way ahead and repeatedly hits enemies in the beam',
  'up.lanternDuration.label': 'Lantern duration +1s',
  'up.lanternDuration.desc': 'Longer lit time and more hits',
  'up.lanternCrit.label': 'Lantern crit up',
  'up.lanternCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireChibiko.label': 'Unlock Chibiko',
  'up.acquireChibiko.desc': 'Throws Lv.1 pencils · boosts owned weapon stats by 10%',
  'up.chibikoCrit.label': 'Chibiko crit up',
  'up.chibikoCrit.desc': 'Crit chance +2%, crit damage x+0.75 (max x4.5)',
  'up.acquireSharkMissile.label': 'Unlock Shark Missile',
  'up.acquireSharkMissile.desc': 'Homing explosion into the densest zombie pack',
  'up.sharkMissileDamage.label': 'Shark Missile damage +{amount} (Lv{level})',
  'up.sharkMissileDamage.desc': 'Increases explosion damage',
  'up.sharkMissileRadius.label': 'Shark Missile radius +',
  'up.sharkMissileRadius.desc': 'Increases explosion radius',
  'up.moveSpeed.label': 'Move speed +10%',
  'up.moveSpeed.desc': 'Increases player move speed',
  'up.maxHealth.label': 'Max health +20',
  'up.maxHealth.desc': 'Increases max HP and current HP',

  // ─── Stage prop names ───
  'prop.classroomDesk': 'Desk',
  'prop.classroomChair': 'Chair',
  'prop.unconsciousStudent': 'Student',
  'prop.classPresidentStudent': 'Class president',
  'prop.corridorLockerBank': 'Lockers',
  'prop.corridorJanitorCart': 'Janitor cart',
  'prop.corridorLostFoundBoard': 'Lost & found board',
  'prop.basketballHoop': 'Basketball hoop',
  'prop.basketballBallCart': 'Ball cart',
  'prop.basketballCluster': 'Basketballs',
  'prop.gymBench': 'Gym bench',
  'prop.gymTrainingCones': 'Cones',
  'prop.gymMats': 'Mats',
  'prop.gymScoreboard': 'Scoreboard',
  'prop.gymBanner': 'Banner',
  'prop.gymExitDoor': 'Exit door',
  'prop.gymEquipmentSpill': 'Spilled equipment',
  'prop.kitchenPrepTable': 'Prep table',
  'prop.kitchenCookLine': 'Cook line',
  'prop.kitchenSinkCounter': 'Sink counter',
  'prop.kitchenRefrigerator': 'Refrigerator',
  'prop.kitchenTrayRack': 'Tray rack',
  'prop.kitchenShelfCart': 'Shelf cart',
  'prop.kitchenTrashBins': 'Trash bins',
  'prop.kitchenCrateStack': 'Crate stack',
  'prop.kitchenClutter': 'Kitchen clutter',

  // ─── Quests ───
  'quest.stage1-talk-book.title': 'Learning to Talk from a Book',
  'quest.stage1-talk-book.startLine': "I'm terrible at talking… if only I had the 'Silver Tongue Handbook'!!!",
  'quest.stage1-talk-book.objective': 'Find the Silver Tongue Handbook across the classroom and bring it back.',
  'quest.stage1-talk-book.itemName': 'Silver Tongue Handbook',
  'quest.stage1-talk-book.itemDesc': 'A red handbook that talks a lot, starting with its cover.',
  'quest.stage1-talk-book.giver': 'Tongue-tied Student',
  'quest.stage1-talk-book.target': 'Tongue-tied Student',
  'quest.stage1-talk-book.completionLine': 'Good… I can speak now. Everyone, listen to me and walk out calmly!',
  'quest.stage1-attendance.title': "The Class President's Last Roll Call",
  'quest.stage1-attendance.startLine': 'I need to know who got out of the classroom… the emergency roll book should be on a front desk.',
  'quest.stage1-attendance.objective': 'Find the emergency roll book on the northwest desk and return it to the class president.',
  'quest.stage1-attendance.itemName': 'Emergency Roll Book',
  'quest.stage1-attendance.itemDesc': 'A roll book with hurried circles around a few names.',
  'quest.stage1-attendance.giver': 'Class President',
  'quest.stage1-attendance.target': 'Class President',
  'quest.stage1-attendance.completionLine': 'Confirmed. Some of them went into the corridor. Let’s follow.',
  'quest.stage2-bandage.title': 'The Bandage in Locker 304',
  'quest.stage2-bandage.startLine': 'There is a compression bandage in locker 304. The code is 0304… we gave up on security long ago.',
  'quest.stage2-bandage.objective': 'Find the compression bandage in the corridor lockers and bring it to the injured student.',
  'quest.stage2-bandage.itemName': 'Compression Bandage',
  'quest.stage2-bandage.itemDesc': "A white bandage roll labeled 'for sports day'.",
  'quest.stage2-bandage.giver': 'Injured Student',
  'quest.stage2-bandage.target': 'Injured Student',
  'quest.stage2-bandage.completionLine': 'There. I can move on my own now. Thank you.',
  'quest.stage2-broadcast-key.title': 'The Master Key Behind the Lost & Found Board',
  'quest.stage2-broadcast-key.startLine': 'We need an emergency broadcast. I taped the broadcast room master key behind the lost & found board.',
  'quest.stage2-broadcast-key.objective': 'Find the broadcast room master key on the south lost & found board.',
  'quest.stage2-broadcast-key.itemName': 'Broadcast Room Master Key',
  'quest.stage2-broadcast-key.itemDesc': "A silver key labeled 'Broadcast room · never lose'.",
  'quest.stage2-broadcast-key.giver': 'Broadcast Club Student',
  'quest.stage2-broadcast-key.target': 'Broadcast Club Student',
  'quest.stage2-broadcast-key.completionLine': 'Good. I will run the evacuation broadcast to the end of the corridor. Keep going!',
  'quest.stage3-whistle.title': "The Captain's Whistle",
  'quest.stage3-whistle.startLine': 'Everyone is panicking… with my whistle I could gather them to one side.',
  'quest.stage3-whistle.objective': "Find the captain's whistle among the basketballs scattered in the northeast.",
  'quest.stage3-whistle.itemName': "Captain's Whistle",
  'quest.stage3-whistle.itemDesc': 'A small whistle on a red cord.',
  'quest.stage3-whistle.giver': 'Basketball Team Captain',
  'quest.stage3-whistle.target': 'Basketball Team Captain',
  'quest.stage3-whistle.completionLine': 'Right, I will get everyone in order. You open the gym exit!',
  'quest.stage3-scoreboard-fuse.title': 'The Dead Emergency Scoreboard',
  'quest.stage3-scoreboard-fuse.startLine': 'If we power the north scoreboard we can display the exit direction. The spare fuse is in the ball cart.',
  'quest.stage3-scoreboard-fuse.objective': 'Find the spare fuse in the ball cart and install it in the north scoreboard.',
  'quest.stage3-scoreboard-fuse.itemName': 'Scoreboard Spare Fuse',
  'quest.stage3-scoreboard-fuse.itemDesc': "A yellow fuse marked 'scoreboard' in bold.",
  'quest.stage3-scoreboard-fuse.giver': 'Gym Facilities Student',
  'quest.stage3-scoreboard-fuse.target': 'North Scoreboard',
  'quest.stage3-scoreboard-fuse.completionLine': 'The scoreboard lights up and an arrow toward the exit appears.',
  'quest.stage4-allergy-list.title': 'Checking Lunch Allergies',
  'quest.stage4-allergy-list.startLine': 'I want to hand out the leftover food, but I have no allergy list. It should be on the east prep table.',
  'quest.stage4-allergy-list.objective': 'Find the lunch allergy list on the east prep table and return it to the serving student.',
  'quest.stage4-allergy-list.itemName': 'Lunch Allergy List',
  'quest.stage4-allergy-list.itemDesc': 'A laminated list, stained but still readable.',
  'quest.stage4-allergy-list.giver': 'Serving Duty Student',
  'quest.stage4-allergy-list.target': 'Serving Duty Student',
  'quest.stage4-allergy-list.completionLine': 'Now I can hand it out safely. I will not make anyone else sick.',
  'quest.stage4-gas-valve.title': 'The Gas Valve That Will Not Stop',
  'quest.stage4-gas-valve.startLine': 'The cook line is leaking gas! The red valve handle rolled toward the sink.',
  'quest.stage4-gas-valve.objective': 'Find the valve handle near the sink and install it on the north cook line.',
  'quest.stage4-gas-valve.itemName': 'Gas Valve Handle',
  'quest.stage4-gas-valve.itemDesc': 'A greasy red cross-shaped metal handle.',
  'quest.stage4-gas-valve.giver': 'Kitchen Crew Student',
  'quest.stage4-gas-valve.target': 'North Cook Line',
  'quest.stage4-gas-valve.completionLine': 'The valve is shut. The cook line flames and hissing die down.',

  // ─── Investigation lines ───
  'dialogue.studentName': 'Zombified Student',
  'dialogue.student.stage1': [
    'The notebook says "homework: not done". Even today, homework follows you.',
    'The ribbon is crooked. Too scared to get close, so I fixed it in my heart.',
  ],
  'dialogue.student.stage2': [
    'That timetable is packed solid. Nobody should be this busy, even as a zombie.',
    'A shoelace came undone. Sorry, lace — cheer up for me instead.',
  ],
  'dialogue.student.stage3': [
    'I can see a whistle. One blow and PE class might start again.',
    'A basketball is stuck to their side. Friend or accomplice? Still unclear.',
  ],
  'dialogue.student.stage4': [
    'The tray is so polite. It looks like it is waiting for food, which is oddly sad.',
    'The spoon and chopsticks are perfectly lined up. My first well-mannered horror.',
  ],
  'dialogue.obj.classroomDesk': [
    'A pencil jabbed the back of my hand. So the desk is on the zombies’ side too.',
    '"Lunch is the best" is carved here. Now my stomach is the one that panicked.',
  ],
  'dialogue.obj.classroomChair': [
    'The chair creaks like it is scolding me. And I never even sat down.',
    'Eraser dust looks like a fuzz monster. Sorry, I looked away first.',
  ],
  'dialogue.obj.corridorLockerBank': [
    'A gym shirt sleeve looked like it was waving. I almost waved back.',
    'The schedule says fitness test. I am already running plenty, thanks.',
  ],
  'dialogue.obj.corridorJanitorCart': [
    'The mop gave me a little bow. I bowed back without thinking.',
    'My face in the bucket is stretched like a noodle. Longer than my hair today.',
  ],
  'dialogue.obj.corridorLostFoundBoard': [
    'A note about a sock that lost its pair. Now I feel lonely too.',
    'A sheet of paper flapped at me. Nothing fakes scary better than paper.',
  ],
  'dialogue.obj.basketballHoop': [
    'The net seems to wink at me. Why is it so relaxed?',
    'Standing under the hoop reminded me of PE grading. Gym beats zombies.',
  ],
  'dialogue.obj.basketballBallCart': [
    'The basketballs stare at me in a circle. Feels like a judging panel.',
    'A wheel squeaked. My secret agent walk was busted instantly.',
  ],
  'dialogue.obj.basketballCluster': [
    'A ball tapped my toe. I said "huh?" like it had spoken to me.',
    'The basketballs look like they are napping. I tried not to wake them.',
  ],
  'dialogue.obj.gymBench': [
    'Dust sits here like an audience. Feels like my own opening ceremony.',
    'I bumped my forehead picking up a name tag. I got found before the tag did.',
  ],
  'dialogue.obj.gymTrainingCones': [
    'The cones stand like hall monitors. I straightened my feet for no reason.',
    'I stood a cone up and it looks even more crooked. Did I ruin its style?',
  ],
  'dialogue.obj.gymMats': [
    'This mat is far too soft. I want to lie down for a second — dangerous.',
    'The rolled mat looks like a gimbap roll. My stomach should not react right now.',
  ],
  'dialogue.obj.gymScoreboard': [
    'The score froze at an awkward number. Even at the end of the world, records nag.',
    'The scoreboard looks like it is quizzing me. No idea, but I nodded anyway.',
  ],
  'dialogue.obj.gymBanner': [
    'The banner shouts "to the end!". So spirited I answered "yes…".',
    'The letters look like they are dancing. The banner is more hyped than the cheer squad.',
  ],
  'dialogue.obj.gymExitDoor': [
    'The handle is ice cold. I think it pranked me first.',
    'The green sign looks confident. Open up and I will believe you instantly.',
  ],
  'dialogue.obj.gymEquipmentSpill': [
    'A jump rope wriggles like a snake. At least it is only a rope.',
    'One ball is peeking out of hiding. I almost shouted "found you".',
  ],
  'dialogue.obj.kitchenPrepTable': [
    'These carrot slices are too neat. The top student in this school is a carrot.',
    'The knife marks look like a map. Probably an onion’s adventure route.',
  ],
  'dialogue.obj.kitchenCookLine': [
    'A pot lid rattled. I think it is handling its own entrance music.',
    'Standing at the cook line makes me feel like serving duty. "More soup, please" came to mind.',
  ],
  'dialogue.obj.kitchenSinkCounter': [
    'Water drips right on the beat. Feels like a music exam.',
    'The scrubber is flattened. It carries all the world’s exhaustion alone.',
  ],
  'dialogue.obj.kitchenRefrigerator': [
    'The fridge seems to sigh. I ended up sighing along with it.',
    'The side-dish tubs are lined up perfectly. Calmer than me — I lost a little.',
  ],
  'dialogue.obj.kitchenTrayRack': [
    'Several of me reflect in the trays. A meeting of frightened mes.',
    'The tray looks ready to announce the menu. Fear-flavored is new to me.',
  ],
  'dialogue.obj.kitchenShelfCart': [
    'The dishes clatter in chorus. I held back from clapping in case it got louder.',
    'I tried to help the cart and it creaked more. Good deeds have loud sound effects.',
  ],
  'dialogue.obj.kitchenTrashBins': [
    'The bin looks like a very talkative face. Sorry, counseling later.',
    'Reading the lunch menu made my stomach growl. Stomach, we are in a meeting.',
  ],
  'dialogue.obj.kitchenCrateStack': [
    'The crates look ready to collapse if I even breathe. So I breathed quietly.',
    'The word "careful" nags at me. I am already being extremely careful.',
  ],
  'dialogue.obj.kitchenClutter': [
    'Ladles and pots sound like an orchestra. No conductor, so it is all clatter.',
    'That spoon is too well behaved. Suspicious — I looked away first.',
  ],

  // ─── Collapsed student one-liners ───
  'dialogue.laid': [
    '…It is not the zombies… I am lying here because I hate studying…',
    'Five more minutes… just five more minutes…',
    'If I get up there is a test. I am not getting up.',
    'Scarier than zombies is performance grading…',
    'My grades are already ruined — what is one zombie apocalypse…',
    'This floor… is cooler than I expected…',
    'Mom… I do not want to go to cram school today…',
    'I am going to sleep straight through to vacation…',
    'I skipped night study to lie down and the world ended.',
    'I closed my eyes after 5th period and they still will not open…',
    '100 days to the exam and the world finished first…',
    'Even zombies do not make you do night study…',
    'Bean sprouts in lunch again… I would rather lie here…',
    'I did not do my homework, so this timing is perfect…',
    'Will they write "survived the zombie outbreak" on my record…',
    'I collapsed after seeing my mock exam ranking…',
    'Mom’s nagging lasts longer than the zombie groans…',
    'I was late and wished school would disappear… well, it did…',
    'I passed out memorizing 100 English words…',
    'Even zombies listen to morning assembly standing up…',
    'I bought three workbooks and only looked at the covers…',
    'A zombie experience instead of the school trip, huh…',
    'The world ended while I was changing into my gym clothes…',
    'Lucky I missed the cram school shuttle… for once…',
    'Report cards come out today so I am not getting up…',
    'Even the top student next door is equal before a zombie…',
    'Anything is fine as long as it is not supplementary class… even zombies…',
    'All my group project teammates turned into zombies… so peaceful…',
    'I miss the 10-minute break the most…',
    'At least zombies do not check homework…',
    'I have never once been awake during morning study hall…',
    'They said college fixes everything… but school went first…',
    'If I had skipped school today it would have been a normal absence…',
    'There are fewer zombies than exam topics — I was surprised…',
    'I got pushed in the lunch line and I am pretending to have fallen…',
    'A zombie beats being called to the staff room…',
    'I came to fill volunteer hours and ended up like this…',
    'One question dropped my grade today… do not touch me…',
    'I turned off five alarms and the world turned out like this…',
    'I left the vacation homework to the me of the day before school starts…',
    'Even a zombie would run if it saw my mistake notebook…',
    'I was writing my personal statement and forgot who I am…',
    'Who knew survival came right after math and English…',
    'It is not cheating… my eyes just went there on their own…',
    'I prayed not to go to school, but not like this…',
    'The fitness test long run… that is my biggest regret right now…',
    'I was happy thinking it was a short day…',
    'I just bought a new uniform and the world ended…',
    'During math class I was already a zombie anyway…',
    'I was going to play after midterms… and the world ended…',
    'If I fall asleep solving problems, I solve problems in my dreams…',
    'There were no zombies in my life plan…',
  ],

  // ─── Legal ───
  'legal.terms.title': 'Terms of Service',
  'legal.privacy.title': 'Privacy Policy',
  'legal.terms.text': `Article 1 (Purpose)
These Terms set out the conditions and procedures for using ${SERVICE_NAME} (the "Game"), and the rights and obligations of users and the operator.

Article 2 (Effect and Amendment of the Terms)
1. These Terms take effect when displayed inside the Game.
2. The operator may amend these Terms when necessary, and amendments are announced inside the Game.
3. If material changes are made, the operator may request your consent again. If you do not agree to the amended Terms, you may stop using the Game and delete your account.

Article 3 (Accounts)
1. The Game is used with a Google account sign-in. During sign-in, the operator receives the account identifier and profile display name provided by Google.
2. You choose your own in-game nickname. Nicknames that impersonate others or cause offense may be changed or removed without prior notice.
3. Your account is for your own use only. You may not transfer, lend, or sell your account.
4. The operator is not liable for damages caused by account misuse resulting from your own failure to manage the account.

Article 4 (Service Content)
1. The Game is provided free of charge.
2. In-game currency (such as gold) and upgrade values are data for game progression only. They cannot be exchanged for cash and have no monetary value.
3. The operator may adjust difficulty, stats, prices, and rewards for game balance. Such adjustments may change the effect of in-game data you have already obtained.

Article 5 (Storage and Publication of Game Records)
1. Your progress is linked to your account and stored on the server, so you can continue playing when you sign in with the same account.
2. Records registered on the ranking are shown to other users together with your nickname (or profile display name). If you do not want to take part in the ranking, you may avoid play sessions that leave such records, or delete your account.

Article 6 (User Obligations)
You must not:
1. Modify the game client or communication data, or obtain records or currency by abnormal means;
2. Use automation programs (macros, etc.);
3. Cause excessive load on the server or interfere with normal operation;
4. Use another person's account without permission;
5. Violate laws or infringe the rights of others.

Article 7 (Usage Restrictions)
If you violate Article 6, the operator may delete records, exclude you from rankings, or restrict your use without prior notice.

Article 8 (Changes and Suspension of Service)
1. The operator may change the content of the Game or discontinue some features.
2. If the service is terminated entirely, notice will be given in advance where possible.
3. The service may be temporarily suspended for unavoidable reasons such as maintenance, network failures, or natural disasters.

Article 9 (Termination and Deletion of Accounts)
1. You may request account deletion at any time from the in-game settings.
2. Deleting your account deletes your progress and in-game currency, and it cannot be restored. For rankings, your own records visible in the current daily and weekly rankings are deleted; for records from past periods that cannot be checked directly in the app, you may request additional deletion through the contact address.
3. If you sign in again after deletion, you start over with a new account and must agree to these Terms and the Privacy Policy again.

Article 10 (Limitation of Liability)
1. The Game is provided as is.
2. The operator is not liable for damages arising from your use of this free Game, unless caused by the operator's intent or gross negligence.
3. The operator is not liable for problems caused by your device environment or network.

Article 11 (Contact)
For inquiries about the Game, please write to ${CONTACT_EMAIL}.

Effective date: ${EFFECTIVE_DATE}`,
  'legal.privacy.text': `${SERVICE_NAME} (the "Game") takes your personal information seriously and processes only the minimum information needed to operate the Game.

1. Information processed
A. Information received through Google sign-in or processed via Firebase Authentication
   - Account identifier (a unique string issued by Google/Firebase). Email address, profile photo URL, email verification status, and sign-in provider information are used only for on-screen display and sign-in state checks; the email address and profile photo URL themselves are not stored in the game database.
   - Profile display name
B. Information you enter directly
   - In-game nickname
C. Information generated while playing
   - Progress records: gold held, permanent upgrade levels, weapon unlock state, stage clear counts and best survival times, last updated time
   - Ranking records: display name, score, survival time, cleared flag, stage, recorded time

The Game does not collect resident registration numbers, contact details, payment information, precise location, contact lists, photos, or advertising identifiers.

2. Purposes
   - Account identification and maintaining sign-in
   - Saving and restoring game progress (so you can continue on a different device)
   - Providing rankings
   - Preventing abuse, such as blocking abnormal records

3. Retention and destruction
   - The above information is kept while your account exists.
   - When you request account deletion, progress records are deleted without delay. Your own records visible in the current daily and weekly rankings are also deleted.
   - For ranking records from past periods, or records the operator must verify separately, deletion is performed after identity confirmation upon request to ${CONTACT_EMAIL}.
   - Where retention is required by law, the data is stored separately for that period and then destroyed.

4. Provision to third parties
The Game does not provide or sell your personal information to third parties. However, display names and records registered on the ranking are shown to other users inside the Game.

5. Processing consignment and overseas transfer
The Game uses the following services to store and process data.
   - Processor: Google LLC (Firebase Authentication, Firebase Realtime Database/Firestore)
   - Consigned work: account authentication, game data storage, ranking data storage
   - Transferred items: the items in section 1
   - Storage country: data centers operated by Google (including outside Korea)
   - Time and method of transfer: transmitted over the network while using the Game

6. Your rights and how to exercise them
   - You may request access to, correction of, or deletion of your information.
   - Account deletion can be performed directly from "Delete account" in the in-game settings.
   - Even without the Game installed, you may request account deletion at ${CONTACT_EMAIL}.
   - Nicknames can be edited directly in the Game.

7. Children's personal information
When processing the personal information of children under 14, the Game requires the consent of a legal guardian. Users under 14 should obtain that consent before playing.

8. Security measures
   - Data in transit uses encrypted communication (HTTPS).
   - Server access rights are kept to a minimum, and security rules ensure each user can access only the data linked to their own account.

9. Privacy officer and contact
   - Contact: ${CONTACT_EMAIL}
   - Please use the address above for inquiries, concerns, or remedies regarding the handling of personal information.

10. Changes to this policy
If this Privacy Policy changes, notice is given inside the Game, and consent is requested again for material changes.

Effective date: ${EFFECTIVE_DATE}`,
}
