// Controller hint data for NuArcade
// Covers TeknoParrot, MAME, Model 2, Model 3 -- arcade emulators only
// Console games excluded (filenames not standardized)
//
// TYPES: gun = light gun, wheel = steering wheel, stick = flight stick
// Only games we are CERTAIN about are listed. No entry = no hint shown.

export const TP_CONTROLLER = {
  'HouseOfTheDead3':               'gun',
  'HouseOfTheDead4':               'gun',
  'AliensArmageddon':              'gun',
  'VirtuaCop3':                    'gun',
  'TimecrisisRazing':              'gun',
  'GunSurvivor':                   'gun',
  'MusicGunGun2':                  'gun',
  'StarTrekVoyager':               'gun',
  'GaiaAttack4':                   'gun',
  'GalagaAssault':                 'gun',
  'Daytona3':                      'wheel',
  'Daytona3NSE':                   'wheel',
  'InitialD8':                     'wheel',
  'InitialD9':                     'wheel',
  'WanganMidnightMaximumTune5DX':  'wheel',
  'WanganMidnightMaximumTune5DXPlus': 'wheel',
  'WanganMidnightMaximumTune6':    'wheel',
  'WanganMidnightMaximumTune6RR':  'wheel',
  'RidgeRacer':                    'wheel',
  'TheCrew':                       'wheel',
  'NFSHeatTakedown':               'wheel',
  'MarioKartArcadeGP':             'wheel',
  'MarioKartArcadeGP2':            'wheel',
  'MarioKartArcadeGPDX':           'wheel',
  'MKDX':                          'wheel',
  'MKDX118':                       'wheel',
  'MKDXUSA':                       'wheel',
  'MKDXUSA106':                    'wheel',
  'AfterBurnerClimax':             'stick',
  'StarWars':                      'stick',
}

export const MAME_CONTROLLER = {
  'area51': 'gun', 'area51mx': 'gun',
  'spacegun': 'gun', 'spacegun2': 'gun',
  'opwolf': 'gun', 'opwolf3': 'gun',
  'opthund': 'gun', 'othunder': 'gun',
  'zombraid': 'gun', 'carnevil': 'gun',
  'vcop': 'gun', 'vcop2': 'gun',
  'lethalen': 'gun', 'lethalene': 'gun', 'lethalenj': 'gun',
  'narc': 'gun',
  'crimepatl': 'gun', 'crimpatla': 'gun', 'crimepatb': 'gun',
  'crossbow': 'gun', 'cheyenne': 'gun', 'catch22': 'gun',
  'rapidfire': 'gun', 'whodunit': 'gun', 'showdown': 'gun',
  'guntour': 'gun', 'claybust': 'gun', 'gpworld': 'gun',
  'cops': 'gun', 'shootout': 'gun',
  'seawolf': 'gun', 'seawolf2': 'gun',
  'jurassicpark': 'gun', 'revolution': 'gun',
  'outrun': 'wheel', 'outrunb': 'wheel', 'outrundx': 'wheel',
  'harddriv': 'wheel', 'harddrivb': 'wheel',
  'racedriv': 'wheel', 'racedrivb': 'wheel',
  'stunrun': 'wheel', 'stun': 'wheel',
  'badlands': 'wheel', 'badlandsb': 'wheel',
  'roadblst': 'wheel', 'roadblstc': 'wheel', 'roadblstg': 'wheel',
  'offroad': 'wheel', 'offroadc': 'wheel',
  'smgp': 'wheel', 'smgpa': 'wheel', 'smgp5': 'wheel', 'smgp6': 'wheel',
  'turbo': 'wheel', 'turbob': 'wheel',
  'topracer': 'wheel', 'topracerc': 'wheel',
  'wgp': 'wheel', 'wgp2': 'wheel',
  'topspeed': 'wheel', 'topspeeda': 'wheel',
  'fullthrl': 'wheel', 'fullthrla': 'wheel',
  'sprint1': 'wheel', 'sprint2': 'wheel', 'sprint4': 'wheel', 'sprint8': 'wheel',
  'gridiron': 'wheel', 'montecar': 'wheel',
  'aburner': 'stick', 'aburner2': 'stick', 'aburnerj': 'stick',
  'topgun': 'stick', 'topgunbl': 'stick',
  'esb': 'stick', 'starwars': 'stick', 'starwarso': 'stick',
  'jedi': 'stick', 'suprstar': 'stick', 'tailg': 'stick',
}

export const MODEL2_CONTROLLER = {
  'gunblade': 'gun', 'gunblad2': 'gun',
  'vcop': 'gun', 'vcop2': 'gun', 'rchase2': 'gun',
  'daytona': 'wheel', 'daytonam': 'wheel', 'daytonagtx': 'wheel',
  'srallyc': 'wheel', 'srallycb': 'wheel',
  'indy500': 'wheel', 'manxtt': 'wheel', 'overrev': 'wheel',
  'motoraid': 'wheel', 'stcc': 'wheel', 'segawski': 'wheel',
  'skisuprg': 'wheel', 'topskatr': 'wheel',
  'aburner': 'stick', 'skytargt': 'stick', 'desert': 'stick',
}

export const MODEL3_CONTROLLER = {
  'lamachin': 'gun', 'oceanhun': 'gun',
  'lostwrld': 'gun', 'lostwrldj': 'gun',
  'scud': 'wheel', 'scuda': 'wheel', 'scudp': 'wheel',
  'daytona2': 'wheel', 'dayto2pe': 'wheel',
  'lemans24': 'wheel', 'srally2': 'wheel', 'srally2dx': 'wheel',
  'harley': 'wheel', 'manxttdx': 'wheel',
  'dirtdevil': 'wheel', 'dirtd2dx': 'wheel',
  'magicride': 'wheel', 'magtruck': 'wheel',
  'starwars': 'stick', 'von2': 'stick', 'von254g': 'stick',
}

export const CONTROLLER_META = {
  gun:   { label: 'Light Gun',      icon: 'GUN',   color: '#ff4444' },
  wheel: { label: 'Steering Wheel', icon: 'WHEEL', color: '#ffaa00' },
  stick: { label: 'Flight Stick',   icon: 'STICK', color: '#00c8ff' },
}

export function getControllerHint(game) {
  if (!game) return null
  const emulator = (game.emulator || '').toLowerCase()
  const gameId   = (game.id || game.profile || '').replace('.xml', '')
  let type = null
  if (emulator === 'teknoparrot' || game.system === 'TeknoParrot') {
    type = TP_CONTROLLER[gameId.replace(/^tp_/, '')] || null
  } else if (emulator === 'mame') {
    const rom = (game.romName || gameId.replace(/^mame_/, '')).toLowerCase()
    type = MAME_CONTROLLER[rom] || null
  } else if (emulator === 'model2') {
    const rom = (game.romName || gameId.replace(/^model2_/, '')).toLowerCase()
    type = MODEL2_CONTROLLER[rom] || null
  } else if (emulator === 'model3') {
    const rom = (game.romName || gameId.replace(/^model3_/, '')).toLowerCase()
    type = MODEL3_CONTROLLER[rom] || null
  }
  if (!type) return null
  return { type, ...CONTROLLER_META[type] }
}
