document.addEventListener('DOMContentLoaded', () => {
// Game variables and constants
// Sound effect objects
const attackSound = new Audio('sfx/attack.wav');
const hitSound = new Audio('sfx/hit.wav');
const pickupSound = new Audio('sfx/item.wav');
const nextlevelSound = new Audio('sfx/nextlvl.wav');
const deadSound = new Audio('sfx/dead.wav');
const healSound = new Audio('sfx/heal.wav');
const levelupSound = new Audio('sfx/levelup.wav');
const upgradeSound = new Audio('sfx/upgrade.wav');
const bumpSound = new Audio('sfx/bump.wav');

// Background music
const bgm = document.getElementById('bgm');
const youDiedModal = document.getElementById('you-died-modal');
const messageHistory = []; // Array to store all messages
const width = 50;
const height = 20;
const tileMap = [];
let inventoryPage = 0; // Keeps track of the current inventory page
let dungeonLevel = 1;
let player = {
  x: 0,
  y: 0,
  hp: 100,
  maxHp: 100,
  attack: 10,
  defense: 5,
  inventory: [],
  maxInventorySize: 20,
  xp: 0,
  xpToLevel: 100,
  skillPoints: 0,
  level: 1,
  luck: 5, // Starting Luck value
  isAlive: true
};


const rooms = [];
const items = [];
const enemies = [];


function createEnemy() {
  let baseHealthMultiplier = 0.8;  // Enemies have 80% of player's health on average
  let baseAttackMultiplier = 1.0;  // Enemies have 100% of player's attack on average
  let baseDefenseMultiplier = 0.8; // Enemies have 80% of player's defense on average
  let minAttack = 3;               // Ensure enemies have a minimum attack power

  let enemy = {
    x: Math.floor(Math.random() * width), // Random position
    y: Math.floor(Math.random() * height), // Random position
    hp: Math.floor(player.maxHp * baseHealthMultiplier + (dungeonLevel * 5)), // Health scales with level
    attack: Math.max(Math.floor(player.attack * baseAttackMultiplier + dungeonLevel + Math.random() * 10), minAttack), // Scaled with level
    defense: Math.floor(player.defense * baseDefenseMultiplier + dungeonLevel / 2), // Enemy defense scaling
    symbol: '☺' // ASCII symbol for enemy
  };

  enemies.push(enemy);
}




const traps = [];
const messages = [];

// Tile types
const WALL = '▓';
const FLOOR = '▒';
const EXIT = 'X';
const ITEM = '*';
const SPECIAL_ITEM = '?';
const TRAP = '^';

function startBackgroundMusic() {
  if (bgm.paused) {
    bgm.volume = 0.2; // Set volume (adjust as needed)
    bgm.play().catch((error) => {
      console.log('Background music playback was prevented:', error);
    });
  }
}

// Game over function
function gameOver() {
  // Show the "You Died!" modal
  youDiedModal.style.display = 'block';
  deadSound.play().catch((error) => {
    console.log('Pickup sound playback was prevented:', error);
  });

  // Set a timeout to restart the game after a few seconds
  setTimeout(() => {
    youDiedModal.style.display = 'none';
    startGame(false); // Restart the game
  }, 3000); // Display the modal for 3 seconds
}


// Initialize map with walls
function initializeMap() {
  for (let y = 0; y < height; y++) {
    tileMap[y] = [];
    for (let x = 0; x < width; x++) {
      tileMap[y][x] = WALL;
    }
  }
}

// Create rooms
function createRooms(numRooms) {
  for (let i = 0; i < numRooms; i++) {
    const roomWidth = getRandomInt(4, 10);
    const roomHeight = getRandomInt(4, 8);
    const xPos = getRandomInt(1, width - roomWidth - 1);
    const yPos = getRandomInt(1, height - roomHeight - 1);

    const newRoom = { x: xPos, y: yPos, width: roomWidth, height: roomHeight };

    // Check for room overlap
    let failed = false;
    for (const otherRoom of rooms) {
      if (roomsOverlap(newRoom, otherRoom)) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      createRoom(newRoom);
      if (rooms.length > 0) {
        // Connect this room to the previous room
        const prevRoom = rooms[rooms.length - 1];
        createCorridor(newRoom, prevRoom);
      } else {
        // Place player in the first room
        player.x = Math.floor(xPos + roomWidth / 2);
        player.y = Math.floor(yPos + roomHeight / 2);
      }
      rooms.push(newRoom);
    } else {
      i--; // Retry if room overlaps
    }
  }
}

// Create a rectangular room
function createRoom(room) {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      tileMap[y][x] = FLOOR;
    }
  }
}

// Create a corridor between two rooms
function createCorridor(roomA, roomB) {
  const pointA = {
    x: Math.floor(roomA.x + roomA.width / 2),
    y: Math.floor(roomA.y + roomA.height / 2)
  };
  const pointB = {
    x: Math.floor(roomB.x + roomB.width / 2),
    y: Math.floor(roomB.y + roomB.height / 2)
  };

  if (Math.random() < 0.5) {
    horizontalTunnel(pointA.x, pointB.x, pointA.y);
    verticalTunnel(pointA.y, pointB.y, pointB.x);
  } else {
    verticalTunnel(pointA.y, pointB.y, pointA.x);
    horizontalTunnel(pointA.x, pointB.x, pointB.y);
  }
}

// Create a horizontal tunnel
function horizontalTunnel(x1, x2, y) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    tileMap[y][x] = FLOOR;
  }
}

// Create a vertical tunnel
function verticalTunnel(y1, y2, x) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
    tileMap[y][x] = FLOOR;
  }
}

// Check if two rooms overlap
function roomsOverlap(roomA, roomB) {
  return (
    roomA.x <= roomB.x + roomB.width &&
    roomA.x + roomA.width >= roomB.x &&
    roomA.y <= roomB.y + roomB.height &&
    roomA.y + roomA.height >= roomB.y
  );
}

// Place exit in the last room
function placeExit() {
  const lastRoom = rooms[rooms.length - 1];
  const x = Math.floor(lastRoom.x + lastRoom.width / 2);
  const y = Math.floor(lastRoom.y + lastRoom.height / 2);
  tileMap[y][x] = EXIT;
}

// Place items randomly in rooms
function placeItems(numItems) {
  for (let i = 0; i < numItems; i++) {
    const room = rooms[getRandomInt(1, rooms.length - 1)]; // Skip the first room
    const x = getRandomInt(room.x + 1, room.x + room.width - 2);
    const y = getRandomInt(room.y + 1, room.y + room.height - 2);
    if (tileMap[y][x] === FLOOR && !isOccupied(x, y) && !isItemAt(x, y) && !isTrapAt(x, y)) {
      // Determine if it's a special item with 10% chance
      const isSpecialItem = Math.random() < 0.1;
      if (isSpecialItem) {
        tileMap[y][x] = SPECIAL_ITEM;
        items.push({ x, y, type: getRandomSpecialItemType(), isSpecial: true });
      } else {
        tileMap[y][x] = ITEM;
        items.push({ x, y, type: getRandomItemType(), isSpecial: false });
      }
    } else {
      i--; // Retry if tile is not floor
    }
  }
}

// Place traps randomly in rooms
function placeTraps(numTraps) {
  for (let i = 0; i < numTraps; i++) {
    const room = rooms[getRandomInt(1, rooms.length - 1)]; // Skip the first room
    const x = getRandomInt(room.x + 1, room.x + room.width - 2);
    const y = getRandomInt(room.y + 1, room.y + room.height - 2);
    if (tileMap[y][x] === FLOOR && !isOccupied(x, y) && !isItemAt(x, y) && !isTrapAt(x, y)) {
      tileMap[y][x] = TRAP;
      traps.push({ x, y, disabled: false });
    } else {
      i--; // Retry if tile is not floor or occupied
    }
  }
}

// Place enemies randomly in rooms
function placeEnemies(numEnemies) {
  for (let i = 0; i < numEnemies; i++) {
    const room = rooms[getRandomInt(1, rooms.length - 1)]; // Skip the first room
    const x = getRandomInt(room.x + 1, room.x + room.width - 2);
    const y = getRandomInt(room.y + 1, room.y + room.height - 2);
    if (tileMap[y][x] === FLOOR && !isOccupied(x, y) && !isItemAt(x, y) && !isTrapAt(x, y)) {
      enemies.push({
        x,
        y,
        hp: 20 + dungeonLevel * 10, // Enemies get stronger each dungeon level
        attack: 5 + dungeonLevel * 2,
        xpValue: 50 + dungeonLevel * 10, // XP given when defeated
        char: '☺',
        isBoss: false
      });
    } else {
      i--; // Retry if tile is not floor or occupied
    }
  }
}

// Place the boss in a room
function placeBoss() {
  const room = rooms[getRandomInt(1, rooms.length - 1)]; // Skip the first room
  const x = Math.floor(room.x + room.width / 2);
  const y = Math.floor(room.y + room.height / 2);
  if (tileMap[y][x] === FLOOR && !isOccupied(x, y) && !isItemAt(x, y) && !isTrapAt(x, y)) {
    enemies.push({
      x,
      y,
      hp: 100 + dungeonLevel * 20, // Boss has much higher HP
      attack: 20 + dungeonLevel * 5,
      xpValue: 200 + dungeonLevel * 50,
      char: '☺',
      isBoss: true
    });
  } else {
    placeBoss(); // Retry if the spot is occupied
  }
}

// Check if tile is occupied by an enemy or player
function isOccupied(x, y) {
  return enemies.some(enemy => enemy.x === x && enemy.y === y) || (player.x === x && player.y === y);
}

// Check if there is an item at the location
function isItemAt(x, y) {
  return items.some(item => item.x === x && item.y === y);
}

// Check if there is a trap at the location
function isTrapAt(x, y) {
  return traps.some(trap => trap.x === x && trap.y === y && !trap.disabled);
}

// Get a random item type
function getRandomItemType() {
  const itemTypes = ['Sword', 'Shield', 'Potion', 'Amulet', 'Water Trap Scroll'];
  return itemTypes[getRandomInt(0, itemTypes.length - 1)];
}


// Get a random special item type
function getRandomSpecialItemType() {
  const specialItemTypes = ['Bag of Holding', 'Ring of Power'];
  return specialItemTypes[getRandomInt(0, specialItemTypes.length - 1)];
}

// Draw the map
function drawMap() {
  let output = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let tile = tileMap[y][x];
      let cssClass = '';

      if (x === player.x && y === player.y) {
        tile = '☻';
        cssClass = 'player';  // Assign player class
      } else if (enemies.some(enemy => enemy.x === x && enemy.y === y)) {
        const enemy = enemies.find(enemy => enemy.x === x && enemy.y === y);
        tile = enemy.char;
        cssClass = enemy.isBoss ? 'boss' : 'enemy';  // Assign boss or enemy class
      } else if (items.some(item => item.x === x && item.y === y)) {
        const item = items.find(item => item.x === x && item.y === y);
        tile = item.isSpecial ? '?' : '*';
        cssClass = item.isSpecial ? 'special-item' : 'item';  // Assign special item or normal item class
      } else if (isTrapAt(x, y)) {
        tile = '░';
        cssClass = 'trap';  // Assign trap class
      } else if (tile === WALL) {
        cssClass = 'wall';  // Assign wall class
      } else if (tile === FLOOR) {
        cssClass = 'floor';  // Assign floor class
      } else if (tile === EXIT) {
        cssClass = 'exit';  // Assign exit class
      }
      
      output += `<span class="${cssClass}">${tile}</span>`;
    }
    output += '\n';
  }
  document.getElementById('game').innerHTML = output;
}

function drawStats() {
  const lowHpClass = player.hp < player.maxHp * 0.2 ? 'low-hp' : '';
  const statsContent = `
    <ul class="stats-list">
      <li><strong>Level:</strong> ${player.level}</li>
      <li><strong>Dungeon Level:</strong> ${dungeonLevel}</li>
      <li><strong>XP:</strong> ${player.xp}/${player.xpToLevel}</li>
      <li><strong>Skill Points:</strong> ${player.skillPoints}</li>
      <li class="${lowHpClass}"><strong>HP:</strong> ${player.hp}/${player.maxHp}</li>
      <li><strong>Attack:</strong> ${player.attack}</li>
      <li><strong>Defense:</strong> ${player.defense}</li>
      <li><strong>Luck:</strong> ${player.luck}</li>
    </ul>
  `;
  document.querySelector('#stats .section-content').innerHTML = statsContent;
}


// Update the player's inventory
function drawInventory() {
  const itemsPerPage = 5;
  const startIndex = inventoryPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.ceil(player.inventory.length / itemsPerPage);

  let inventoryContent = `<p><strong>Inventory (${player.inventory.length}/${player.maxInventorySize}):</strong></p>`;

  if (player.inventory.length === 0) {
    inventoryContent += '<p>Empty</p>';
  } else {
    // Display items for the current page
    const itemsToShow = player.inventory.slice(startIndex, endIndex);

    inventoryContent += '<ol class="inventory-list" start="' + (startIndex + 1) + '">';
    itemsToShow.forEach((item, index) => {
      inventoryContent += `<li>[${startIndex + index + 1}] ${item.type}</li>`;
    });
    inventoryContent += '</ol>';

    // Add pagination buttons
    inventoryContent += '<div class="inventory-pagination">';
    if (inventoryPage > 0) {
      inventoryContent += '<button id="prev-inv-page">Previous Page</button>';
    } else {
      inventoryContent += '<button id="prev-inv-page" disabled>Previous Page</button>';
    }
    if (inventoryPage < totalPages - 1) {
      inventoryContent += '<button id="next-inv-page">Next Page</button>';
    } else {
      inventoryContent += '<button id="next-inv-page" disabled>Next Page</button>';
    }
    inventoryContent += '</div>';
  }

  document.querySelector('#inventory .section-content').innerHTML = inventoryContent;

  // Add event listeners for pagination buttons
  if (document.getElementById('prev-inv-page')) {
    document.getElementById('prev-inv-page').addEventListener('click', () => {
      if (inventoryPage > 0) {
        inventoryPage--;
        drawInventory();
      }
    });
  }

  if (document.getElementById('next-inv-page')) {
    document.getElementById('next-inv-page').addEventListener('click', () => {
      if (inventoryPage < totalPages - 1) {
        inventoryPage++;
        drawInventory();
      }
    });
  }
}

// Modify drawMessages function
function drawMessages() {
  // Append new messages to the message history
  messageHistory.push(...messages);

  // Display only the last 5 messages
  const recentMessages = messageHistory.slice(-5);

  // Build HTML content with indentation
  const messageHtml = recentMessages.map(msg => `<div class="message-item">${msg}</div>`).join('');

  document.querySelector('#messages .section-content').innerHTML = messageHtml;

  // Clear the messages array
  messages.length = 0;
}

// Move the player
function movePlayer(dx, dy) {
  // Start background music on first move
  startBackgroundMusic();
  const newX = player.x + dx;
  const newY = player.y + dy;
  

  if (tileMap[newY][newX] !== WALL) {
    // Check for enemy collision
    const enemy = enemies.find(e => e.x === newX && e.y === newY);
    if (enemy) {
      attackEnemy(enemy);
    } else {
      player.x = newX;
      player.y = newY;
      // Check for traps
      const trap = traps.find(trap => trap.x === newX && trap.y === newY && !trap.disabled);
      if (trap) {
        triggerTrap(trap);
      }
      // Check for item pickup
      const itemIndex = items.findIndex(item => item.x === newX && item.y === newY);
      if (itemIndex !== -1) {
        const item = items[itemIndex];
        if (player.inventory.length < player.maxInventorySize) {
          player.inventory.push(item);
          if (item.type !== 'Potion') {
            applyItemEffect(item);
          }
          items.splice(itemIndex, 1);
          tileMap[newY][newX] = FLOOR;
          messages.push(`You picked up a ${item.type}!`);
      
          // Play pickup sound
          pickupSound.play().catch((error) => {
            console.log('Pickup sound playback was prevented:', error);
          });
        } else {
          messages.push('Inventory full! Cannot pick up more items.');
        }
      }

      if (tileMap[newY][newX] === EXIT) {
        messages.push('You have reached the exit! Proceeding to the next dungeon level...');
        startGame(true); // Start next level
        return;
      }
    }
  } else {
    messages.push('You bump into a wall.');
    bumpSound.play().catch((error) => {
      console.log('Pickup sound playback was prevented:', error);
    });
  }
  
  updateGame();
}

// Enemy AI
function moveEnemies() {
  for (const enemy of enemies) {
    if (canSeePlayer(enemy)) {
      // Simple pathfinding towards the player
      const dx = player.x > enemy.x ? 1 : (player.x < enemy.x ? -1 : 0);
      const dy = player.y > enemy.y ? 1 : (player.y < enemy.y ? -1 : 0);

      const newX = enemy.x + dx;
      const newY = enemy.y + dy;

      if (tileMap[newY][newX] !== WALL && !isOccupied(newX, newY) && !(newX === player.x && newY === player.y)) {
        enemy.x = newX;
        enemy.y = newY;
      } else if (newX === player.x && newY === player.y) {
        // Enemy attacks player
        attackPlayer(enemy);
      }
    }
  }
}

// Check if enemy can see the player (simple LOS)
function canSeePlayer(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= 5; // Enemy can see player within 5 tiles
}

// Enemy attacks player
function attackPlayer(enemy) {
  // Play hit sound
  hitSound.play().catch((error) => {
    console.log('Hit sound playback was prevented:', error);
  });

  // Calculate enemy miss chance based on dungeon level
  const enemyMissChance = Math.max(5, 20 - dungeonLevel * 2); // Decreases with dungeon level
  const didMiss = Math.random() * 100 < enemyMissChance;

  if (didMiss) {
    messages.push(`${enemy.isBoss ? 'The Boss' : 'An enemy'} misses you!`);
  } else {
    const minDamage = 2;  // Ensure a minimum damage of 2
    const rawDamage = enemy.attack - player.defense;
    const damage = Math.max(rawDamage, minDamage);  // Calculate damage with a minimum threshold

    player.hp -= damage;
    messages.push(`${enemy.isBoss ? 'The Boss' : 'An enemy'} hits you for ${damage} damage!`);

    if (player.hp <= 0) {
      player.hp = 0; // Ensure HP doesn't go negative
      gameOver();    // Call the gameOver function to trigger the "You Died" modal
    }
  }
}




// Player attacks enemy
function attackEnemy(enemy) {
  // Play attack sound
  attackSound.play().catch((error) => {
    console.log('Attack sound playback was prevented:', error);
  });

  // Calculate miss chance based on player's Luck
  const missChance = Math.max(5, 20 - player.luck); // Minimum miss chance of 5%
  const didMiss = Math.random() * 100 < missChance;

  if (didMiss) {
    messages.push('You miss!');
  } else {
    const damage = Math.max(0, player.attack - 0); // Enemies have no defense in this example
    enemy.hp -= damage;
    messages.push(`You hit ${enemy.isBoss ? 'the Boss' : 'the enemy'} for ${damage} damage!`);

    if (enemy.hp <= 0) {
      messages.push(`You have defeated ${enemy.isBoss ? 'the Boss' : 'an enemy'}!`);
      gainExperience(enemy.xpValue);
      if (enemy.isBoss) {
        // Boss drops a special item and upgrades inventory
        player.maxInventorySize += 2;
        messages.push('Your inventory capacity has increased by 2!');
        const specialItem = {
          x: enemy.x,
          y: enemy.y,
          type: 'Boss Trophy',
          isSpecial: true
        };
        items.push(specialItem);
        tileMap[enemy.y][enemy.x] = SPECIAL_ITEM;
      }
      enemies.splice(enemies.indexOf(enemy), 1);
    }
  }
}




// Gain experience
function gainExperience(amount) {
  player.xp += amount;
  messages.push(`You gained ${amount} XP!`);
  if (player.xp >= player.xpToLevel) {
    levelUp();
  }
}

// Level up the player
function levelUp() {
  player.xp -= player.xpToLevel;
  player.level++;
  player.skillPoints += 1;
  player.luck += 1; // Increase Luck by 1 each level
  player.xpToLevel = Math.floor(player.xpToLevel * 1.5); // Increase XP needed for next level
  levelupSound.play().catch((error) => {
    console.log('Hit sound playback was prevented:', error);
  });
  messages.push(`You leveled up to level ${player.level}! Luck increased to ${player.luck}. You have gained 1 skill point.`);
}



// Apply item effect to player
function applyItemEffect(item) {
  const effectMultiplier = 2; // Items are stronger now
  if (item.isSpecial) {
    // Apply special item effects
    switch (item.type) {
      case 'Bag of Holding':
        player.maxInventorySize += 2;
        messages.push('Your inventory capacity has increased!');
        break;
      case 'Ring of Power':
        player.attack += 10;
        player.defense += 5;
        messages.push('You feel a surge of power!');
        break;
      case 'Boss Trophy':
        player.attack += 15;
        player.defense += 10;
        messages.push('You feel empowered by the Boss Trophy!');
        break;
    }
  } else {
    // Apply normal item effects (except Potion)
    switch (item.type) {
      case 'Sword':
        player.attack += 5 * effectMultiplier;
        break;
      case 'Shield':
        player.defense += 3 * effectMultiplier;
        break;
      case 'Amulet':
        player.attack += 2 * effectMultiplier;
        player.defense += 2 * effectMultiplier;
        break;
    }
  }
}

// Remove item effect from player
function removeItemEffect(item) {
  const effectMultiplier = 2; // Items are stronger now
  if (item.isSpecial) {
    // Remove special item effects
    switch (item.type) {
      case 'Bag of Holding':
        player.maxInventorySize -= 2;
        // Ensure inventory size is not less than current items
        if (player.maxInventorySize < player.inventory.length) {
          player.maxInventorySize = player.inventory.length;
        }
        messages.push('Your inventory capacity has decreased.');
        break;
      case 'Ring of Power':
        player.attack -= 10;
        player.defense -= 5;
        messages.push('You feel less powerful.');
        break;
      case 'Boss Trophy':
        player.attack -= 15;
        player.defense -= 10;
        messages.push('The power of the Boss Trophy fades.');
        break;
    }
  } else {
    // Remove normal item effects (except Potion)
    switch (item.type) {
      case 'Sword':
        player.attack -= 5 * effectMultiplier;
        break;
      case 'Shield':
        player.defense -= 3 * effectMultiplier;
        break;
      case 'Amulet':
        player.attack -= 2 * effectMultiplier;
        player.defense -= 2 * effectMultiplier;
        break;
    }
  }
}

// Use an item
function useItem(slot, direction) {
  if (slot >= 1 && slot <= player.inventory.length) {
    const item = player.inventory[slot - 1];

    if (item.type === 'Potion') {
      healSound.play().catch((error) => {
        console.log('Hit sound playback was prevented:', error);
      });
      const healAmount = 50; // Amount of HP restored
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      messages.push(`You used a Potion and restored ${healAmount} HP!`);
      player.inventory.splice(slot - 1, 1); // Remove used item
    } else if (item.type === 'Water Trap Scroll') {
      if (!direction) {
        messages.push('Please specify a direction to use the Water Trap Scroll (up, down, left, right).');
        return;
      }
      useWaterTrapScroll(direction);
      // Remove the item after use
      player.inventory.splice(slot - 1, 1);
    } else {
      messages.push(`You cannot use ${item.type} right now.`);
    }
  } else {
    messages.push('Invalid inventory slot.');
  }
}

function useWaterTrapScroll(direction) {
  const dirOffsets = {
    'up': { dx: 0, dy: -1 },
    'down': { dx: 0, dy: 1 },
    'left': { dx: -1, dy: 0 },
    'right': { dx: 1, dy: 0 }
  };

  const offset = dirOffsets[direction];
  if (!offset) {
    messages.push('Invalid direction. Use up, down, left, or right.');
    return;
  }

  const targetX = player.x + offset.dx;
  const targetY = player.y + offset.dy;

  // Check if the target tile is within the map bounds and is a floor
  if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height && tileMap[targetY][targetX] === FLOOR) {
    // Place the water trap
    traps.push({
      x: targetX,
      y: targetY,
      type: 'Water Pool',
      duration: 3, // Lasts for 3 turns
      damage: 30, // Damage dealt to enemies
      disabled: false
    });
    messages.push(`You create a water pool trap to the ${direction}!`);
  } else {
    messages.push('You cannot place a water pool there.');
  }
}


// Disable or attack a trap
function disableTrap() {
  const trap = traps.find(trap => trap.x === player.x && trap.y === player.y && !trap.disabled);
  if (trap) {
    trap.disabled = true;
    messages.push('You have disabled the trap.');
  } else {
    messages.push('There is no trap here to disable.');
  }
}

// Trigger a trap
function triggerTrap(trap) {
  hitSound.play().catch((error) => {
    console.log('Hit sound playback was prevented:', error);
  });
  const damage = getRandomInt(10, 20);
  player.hp -= damage;
  messages.push(`You triggered a trap and took ${damage} damage!`);
  if (player.hp <= 0) {
    player.hp = 0; // Ensure HP doesn't go negative
    messages.push('You have been killed by a trap!');
    drawMessages(); // Update messages
    drawStats(); // Update stats
    gameOver(); // Handle game over
  }
}

// Utility function to get random integer between min and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateGame() {
  moveEnemies();  // Move the enemies
  drawMap();      // Update the map
  updateTraps();
  drawStats();    // Update stats
  drawInventory();  // Update inventory
  drawMessages(); // Update messages
}

function updateTraps() {
  // Apply trap effects to enemies and manage trap durations
  for (let i = traps.length - 1; i >= 0; i--) {
    const trap = traps[i];
    if (trap.duration !== undefined) {
      // Decrease trap duration
      trap.duration--;
      if (trap.duration <= 0) {
        // Remove the trap from the map
        traps.splice(i, 1);
        continue;
      }
    }

    // Apply effects to enemies on the trap
    enemies.forEach(enemy => {
      if (enemy.x === trap.x && enemy.y === trap.y) {
        if (trap.type === 'Water Pool') {
          enemy.hp -= trap.damage;
          messages.push(`An enemy takes ${trap.damage} damage from the water pool!`);
          if (enemy.hp <= 0) {
            messages.push('An enemy has been defeated by the water pool!');
            gainExperience(enemy.xpValue);
            enemies.splice(enemies.indexOf(enemy), 1);
          }
        }
      }
    });
  }
}


// Start or reset the game
function startGame(nextLevel) {
  if (nextLevel) {
    nextlevelSound.play().catch((error) => {
      console.log('Pickup sound playback was prevented:', error);
    });
    dungeonLevel++;
  } else {
    // Reset game state
    dungeonLevel = 1;
    player = {
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      attack: 10,
      defense: 5,
      inventory: [],
      maxInventorySize: 4,
      xp: 0,
      xpToLevel: 100,
      skillPoints: 0,
      luck: 5, // Make sure to include this
      level: 1
    };
    messageHistory.length = 0;
    messages.length = 0;
  }
  tileMap.length = 0;
  rooms.length = 0;
  items.length = 0;
  enemies.length = 0;
  traps.length = 0;
  messages.length = 0;
  initializeMap();
  createRooms(8); // Number of rooms remains the same
  placeExit();
  placeItems(5); // Fewer items
  placeEnemies(5 + dungeonLevel * 2); // More enemies each dungeon level
  placeTraps(10); // Number of traps

  // Place a boss every 5 dungeon levels
  if (dungeonLevel % 5 === 0) {
    placeBoss();
    messages.push('A powerful Boss awaits you on this level!');
  }

  drawMap();
}

// Handle commands
function handleCommand(command) {
  const args = command.trim().toLowerCase().split(' ');

  if (args[0] === 'drop') {
    const slot = parseInt(args[1], 10);
    if (!isNaN(slot) && slot >= 1 && slot <= player.inventory.length) {
      const item = player.inventory.splice(slot - 1, 1)[0];
      messages.push(`You dropped a ${item.type}.`);
      // Place the item on the ground
      tileMap[player.y][player.x] = item.isSpecial ? SPECIAL_ITEM : ITEM;
      items.push({ x: player.x, y: player.y, type: item.type, isSpecial: item.isSpecial });
      // Remove item effects
      removeItemEffect(item);
    } else {
      messages.push('Invalid slot number.');
    }
  } else if (args[0] === 'use' && args[1] === 'item') {
    const slot = parseInt(args[2], 10);
    const direction = args[3]; // Optional direction argument
    if (!isNaN(slot)) {
      useItem(slot, direction);
    } else {
      messages.push('Invalid command. Usage: use item [slot number] [direction]');
    }
  } else if ((args[0] === 'disable' && args[1] === 'trap') || (args[0] === 'attack' && args[1] === 'trap')) {
    disableTrap();
  } else if (args[0] === 'upgrade') {
    upgradeAttribute(args[1]);
  } else {
    messages.push('Unknown command.');
  }
  drawMap();
}

// Upgrade player attributes
function upgradeAttribute(attribute) {
  if (player.skillPoints > 0) {
    switch (attribute) {
      case 'health':
        player.maxHp += 20;
        player.hp += 20;
        player.skillPoints--;
        upgradeSound.play().catch((error) => {
          console.log('Hit sound playback was prevented:', error);
        });
        messages.push('You have increased your maximum health!');
        break;
      case 'attack':
        player.attack += 5;
        player.skillPoints--;
        upgradeSound.play().catch((error) => {
          console.log('Hit sound playback was prevented:', error);
        });
        messages.push('You have increased your attack power!');
        break;
      case 'defense':
        player.defense += 3;
        player.skillPoints--;
        upgradeSound.play().catch((error) => {
          console.log('Hit sound playback was prevented:', error);
        });
        messages.push('You have increased your defense!');
        break;
      default:
        messages.push('Invalid attribute. You can upgrade health, attack, or defense.');
        return;
    }
  } else {
    messages.push('You have no skill points to spend.');
  }
}

document.addEventListener('keydown', (e) => {
  if (youDiedModal.style.display === 'block') return; // Do nothing if modal is displayed
  if (document.activeElement !== commandInput) {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        movePlayer(0, -1);
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
        movePlayer(0, 1);
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
        movePlayer(-1, 0);
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
        movePlayer(1, 0);
        e.preventDefault();
        break;
    }
  }
});

// Add event listeners for the on-screen control buttons
document.getElementById('up-button').addEventListener('click', () => {
  movePlayer(0, -1);
});
document.getElementById('down-button').addEventListener('click', () => {
  movePlayer(0, 1);
});
document.getElementById('left-button').addEventListener('click', () => {
  movePlayer(-1, 0);
});
document.getElementById('right-button').addEventListener('click', () => {
  movePlayer(1, 0);
});

// Modal functionality for the Tips button
const modal = document.getElementById('modal');
const showTipsButton = document.getElementById('show-tips');
const closeModal = document.getElementById('close-modal');

showTipsButton.addEventListener('click', () => {
  modal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

// Handle command input
const commandInput = document.getElementById('commandInput');
commandInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (youDiedModal.style.display === 'block') {
      commandInput.value = '';
      return; // Do nothing if modal is displayed
    }
    const command = commandInput.value;
    handleCommand(command);
    commandInput.value = '';
  }
});
// Start the game
startGame(false);
});

// Example for sound effects
attackSound.play().catch((error) => {
  console.log('Attack sound playback was prevented:', error);
});



function progressToNextLevel() {
  dungeonLevel++;
  nextlevelSound.play();
  generateNewDungeon(); // Your existing logic to create a new dungeon layout
  enemies.length = 0;  // Clear old enemies
  spawnEnemies();      // Spawn stronger enemies for the next level
  displayMessage("You've reached dungeon level " + dungeonLevel + "!");
}


function spawnEnemies() {
  for (let i = 0; i < dungeonLevel * 2; i++) {
    createEnemy(); // Create stronger, balanced enemies based on level and player stats
  }
}
