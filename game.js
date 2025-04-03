const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        create: create,
        update: update
    }
};

let game;
let player;
let playerPieces = []; // 玩家的所有碎片
let enemies = [];
let foods = [];
let cursors;
let spaceKey;
let wKey;
let score = 0;
let scoreText;
let camera;
let playerName = '玩家';
const WORLD_SIZE = 2000; // 世界大小

// 歷史人物名字列表
const historicalFigures = [
    '秦始皇', '漢武帝', '唐太宗', '成吉思汗', '康熙帝',
    '拿破崙', '亞歷山大', '凱撒', '達文西', '愛因斯坦',
    '牛頓', '莎士比亞', '貝多芬', '莫扎特', '達爾文',
    '伽利略', '哥白尼', '愛迪生', '特斯拉', '居里夫人',
    '孔子', '老子', '莊子', '孟子', '孫子',
    '蘇格拉底', '柏拉圖', '亞里士多德', '阿基米德', '歐幾里得'
];

// 用於追蹤已使用的名字
let usedNames = new Set();

function getRandomName() {
    // 如果所有名字都已使用，重置已使用名字集合
    if (usedNames.size >= historicalFigures.length) {
        usedNames.clear();
    }
    
    let availableNames = historicalFigures.filter(name => !usedNames.has(name));
    let randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
    usedNames.add(randomName);
    return randomName;
}

// 等待DOM加載完成
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-button');
    const playerNameInput = document.getElementById('player-name');
    const startScreen = document.getElementById('start-screen');

    startButton.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        if (name) {
            playerName = name;
        }
        startScreen.style.display = 'none';
        game = new Phaser.Game(config);
    });
});

function updateLeaderboard() {
    const leaderboard = document.getElementById('player-scores');
    if (!leaderboard) return;

    leaderboard.innerHTML = '';

    // 創建所有分數的數組
    const scores = [];

    // 添加玩家分數
    scores.push({
        name: playerName,
        score: score,
        isPlayer: true
    });

    // 添加敵人分數
    enemies.forEach(enemy => {
        scores.push({
            name: enemy.name,
            score: Math.floor(enemy.mass),
            isPlayer: false
        });
    });

    // 按分數降序排序
    scores.sort((a, b) => b.score - a.score);

    // 顯示排序後的分數
    scores.forEach(item => {
        const scoreElement = document.createElement('div');
        scoreElement.className = 'player-score';
        if (item.isPlayer) {
            scoreElement.style.backgroundColor = '#ffe6e6'; // 玩家使用淺紅色背景
        }
        scoreElement.innerHTML = `
            <span class="name">${item.name}</span>
            <span class="score">${item.score}</span>
        `;
        leaderboard.appendChild(scoreElement);
    });
}

function create() {
    // 創建遊戲世界
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    // 創建網格背景
    const gridSize = 50;
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xcccccc, 0.5);
    
    // 繪製垂直線
    for (let x = 0; x <= WORLD_SIZE; x += gridSize) {
        graphics.lineBetween(x, 0, x, WORLD_SIZE);
    }
    
    // 繪製水平線
    for (let y = 0; y <= WORLD_SIZE; y += gridSize) {
        graphics.lineBetween(0, y, WORLD_SIZE, y);
    }

    // 創建玩家（紅色圓形）
    player = this.add.circle(WORLD_SIZE/2, WORLD_SIZE/2, 20, 0xff0000);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.mass = 10; // 初始質量
    player.radius = Math.sqrt(player.mass) * 4; // 根據質量計算半徑
    player.setRadius(player.radius);
    playerPieces.push(player);

    // 創建敵人
    for (let i = 0; i < 5; i++) {
        createEnemy.call(this,
            Phaser.Math.Between(50, WORLD_SIZE-50),
            Phaser.Math.Between(50, WORLD_SIZE-50)
        );
    }

    // 創建食物（綠色圓形）
    for (let i = 0; i < 50; i++) {
        const food = this.add.circle(
            Phaser.Math.Between(50, WORLD_SIZE-50),
            Phaser.Math.Between(50, WORLD_SIZE-50),
            5,
            0x00ff00
        );
        this.physics.add.existing(food);
        foods.push(food);
    }

    // 設置鍵盤控制
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    // 設置相機
    camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    camera.startFollow(player, true, 0.1, 0.1);

    // 顯示分數
    scoreText = this.add.text(16, 16, '分數: 0', { 
        fontSize: '32px', 
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
    });
    scoreText.setScrollFactor(0);

    // 初始化排行榜
    updateLeaderboard();
}

function update() {
    // 處理玩家移動
    playerPieces.forEach(piece => {
        const speed = 200 / Math.sqrt(piece.mass);
        
        if (cursors.left.isDown) {
            piece.body.setVelocityX(-speed);
        } else if (cursors.right.isDown) {
            piece.body.setVelocityX(speed);
        } else {
            piece.body.setVelocityX(0);
        }

        if (cursors.up.isDown) {
            piece.body.setVelocityY(-speed);
        } else if (cursors.down.isDown) {
            piece.body.setVelocityY(speed);
        } else {
            piece.body.setVelocityY(0);
        }

        // 更新大小
        piece.radius = Math.sqrt(piece.mass) * 4;
        piece.setRadius(piece.radius);
    });

    // 處理分裂（按空格鍵）
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        splitPlayer();
    }

    // 處理噴射質量（按 W 鍵）
    if (wKey.isDown) {
        shootMass();
    }

    // 更新敵人 AI
    enemies.forEach(enemy => {
        const speed = 200 / Math.sqrt(enemy.mass);

        // 尋找最近的目標
        let nearestTarget = null;
        let minDistance = Infinity;

        // 檢查食物
        foods.forEach(food => {
            const distance = Phaser.Math.Distance.Between(
                enemy.x, enemy.y,
                food.x, food.y
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestTarget = food;
            }
        });

        // 檢查玩家碎片（如果玩家比敵人小）
        playerPieces.forEach(piece => {
            if (piece.mass < enemy.mass) {
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    piece.x, piece.y
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestTarget = piece;
                }
            }
        });

        // 檢查其他敵人（如果其他敵人比當前敵人小）
        enemies.forEach(otherEnemy => {
            if (otherEnemy !== enemy && otherEnemy.mass < enemy.mass) {
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    otherEnemy.x, otherEnemy.y
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestTarget = otherEnemy;
                }
            }
        });

        // 移動敵人
        if (nearestTarget) {
            const angle = Phaser.Math.Angle.Between(
                enemy.x, enemy.y,
                nearestTarget.x, nearestTarget.y
            );
            enemy.body.setVelocityX(Math.cos(angle) * speed);
            enemy.body.setVelocityY(Math.sin(angle) * speed);
        }

        // 更新敵人大小
        enemy.radius = Math.sqrt(enemy.mass) * 4;
        enemy.setRadius(enemy.radius);
    });

    // 檢查敵人互相吃掉
    enemies.forEach((enemy, index) => {
        enemies.forEach((otherEnemy, otherIndex) => {
            if (enemy !== otherEnemy && 
                enemy.mass > otherEnemy.mass * 1.1 &&
                Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    otherEnemy.x, otherEnemy.y
                ) < enemy.radius) {
                // 敵人吃掉其他敵人
                enemy.mass += otherEnemy.mass * 0.8;
                otherEnemy.destroy();
                enemies.splice(otherIndex, 1);
                
                // 重新生成被吃掉的敵人
                createEnemy.call(this,
                    Phaser.Math.Between(50, WORLD_SIZE-50),
                    Phaser.Math.Between(50, WORLD_SIZE-50)
                );
            }
        });
    });

    // 檢查碰撞
    // 敵人吃食物
    enemies.forEach(enemy => {
        foods.forEach((food, index) => {
            if (Phaser.Math.Distance.Between(
                enemy.x, enemy.y,
                food.x, food.y
            ) < enemy.radius) {
                // 增加敵人大小
                enemy.mass += 2;
                enemy.radius = Math.sqrt(enemy.mass) * 4;
                enemy.setRadius(enemy.radius);
                
                // 移除食物
                food.destroy();
                foods.splice(index, 1);
                
                // 創建新的食物
                const newFood = this.add.circle(
                    Phaser.Math.Between(50, WORLD_SIZE-50),
                    Phaser.Math.Between(50, WORLD_SIZE-50),
                    5,
                    0x00ff00
                );
                this.physics.add.existing(newFood);
                foods.push(newFood);
            }
        });
    });

    // 玩家吃食物
    playerPieces.forEach(piece => {
        foods.forEach((food, index) => {
            if (Phaser.Math.Distance.Between(
                piece.x, piece.y,
                food.x, food.y
            ) < piece.radius) {
                // 增加玩家大小
                piece.mass += 2;
                piece.radius = Math.sqrt(piece.mass) * 4;
                piece.setRadius(piece.radius);
                
                // 更新分數
                score += 10;
                scoreText.setText('分數: ' + score);
                
                // 移除食物
                food.destroy();
                foods.splice(index, 1);
                
                // 創建新的食物
                const newFood = this.add.circle(
                    Phaser.Math.Between(50, WORLD_SIZE-50),
                    Phaser.Math.Between(50, WORLD_SIZE-50),
                    5,
                    0x00ff00
                );
                this.physics.add.existing(newFood);
                foods.push(newFood);
            }
        });

        // 玩家吃敵人
        enemies.forEach((enemy, index) => {
            if (piece.mass > enemy.mass * 1.1 && 
                Phaser.Math.Distance.Between(
                    piece.x, piece.y,
                    enemy.x, enemy.y
                ) < piece.radius) {
                // 增加玩家大小
                piece.mass += enemy.mass * 0.8;
                piece.radius = Math.sqrt(piece.mass) * 4;
                piece.setRadius(piece.radius);
                
                // 更新分數
                score += 50;
                scoreText.setText('分數: ' + score);
                
                // 移除敵人
                enemy.destroy();
                enemies.splice(index, 1);
                
                // 創建新的敵人
                createEnemy.call(this,
                    Phaser.Math.Between(50, WORLD_SIZE-50),
                    Phaser.Math.Between(50, WORLD_SIZE-50)
                );
            }
        });
    });

    // 敵人吃玩家
    enemies.forEach(enemy => {
        playerPieces.forEach((piece, index) => {
            if (enemy.mass > piece.mass * 1.1 && 
                Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    piece.x, piece.y
                ) < enemy.radius) {
                // 增加敵人大小
                enemy.mass += piece.mass * 0.8;
                enemy.radius = Math.sqrt(enemy.mass) * 4;
                enemy.setRadius(enemy.radius);
                
                // 移除玩家碎片
                piece.destroy();
                playerPieces.splice(index, 1);
                
                // 如果所有玩家碎片都被吃掉，顯示遊戲結束提示
                if (playerPieces.length === 0) {
                    if (confirm('遊戲結束！\n\n你的分數是：' + score + '\n\n是否要重新開始？')) {
                        location.reload();
                    }
                }
            }
        });
    });

    // 更新排行榜
    updateLeaderboard();
}

function splitPlayer() {
    // 只有當玩家質量足夠大時才能分裂
    if (playerPieces[0].mass >= 20) {
        const newPiece = this.add.circle(
            playerPieces[0].x,
            playerPieces[0].y,
            Math.sqrt(playerPieces[0].mass / 2) * 4,
            0xff0000
        );
        this.physics.add.existing(newPiece);
        newPiece.body.setCollideWorldBounds(true);
        newPiece.mass = playerPieces[0].mass / 2;
        newPiece.radius = Math.sqrt(newPiece.mass) * 4;
        newPiece.setRadius(newPiece.radius);
        
        // 設置新碎片的速度
        const angle = Phaser.Math.Angle.Between(
            playerPieces[0].x,
            playerPieces[0].y,
            this.input.mousePointer.x,
            this.input.mousePointer.y
        );
        const speed = 200 / Math.sqrt(newPiece.mass);
        newPiece.body.setVelocityX(Math.cos(angle) * speed);
        newPiece.body.setVelocityY(Math.sin(angle) * speed);
        
        // 更新原碎片質量
        playerPieces[0].mass /= 2;
        
        playerPieces.push(newPiece);
    }
}

function shootMass() {
    // 只有當玩家質量足夠大時才能噴射
    if (playerPieces[0].mass >= 15) {
        // 創建噴射的質量
        const mass = this.add.circle(
            playerPieces[0].x,
            playerPieces[0].y,
            5,
            0xff0000
        );
        this.physics.add.existing(mass);
        
        // 設置噴射方向
        const angle = Phaser.Math.Angle.Between(
            playerPieces[0].x,
            playerPieces[0].y,
            this.input.mousePointer.x,
            this.input.mousePointer.y
        );
        const speed = 400;
        mass.body.setVelocityX(Math.cos(angle) * speed);
        mass.body.setVelocityY(Math.sin(angle) * speed);
        
        // 減少玩家質量
        playerPieces[0].mass -= 1;
        
        // 3秒後移除噴射的質量
        this.time.delayedCall(3000, () => {
            mass.destroy();
        });
    }
}

function resetGame() {
    // 重置玩家
    player = this.add.circle(WORLD_SIZE/2, WORLD_SIZE/2, 20, 0xff0000);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.mass = 10;
    player.radius = Math.sqrt(player.mass) * 4;
    player.setRadius(player.radius);
    playerPieces = [player];
    
    // 重置分數
    score = 0;
    scoreText.setText('分數: ' + score);
    
    // 重置相機
    camera.startFollow(player, true, 0.1, 0.1);
    
    // 重新生成所有敵人
    enemies.forEach(enemy => enemy.destroy());
    enemies = [];
    for (let i = 0; i < 5; i++) {
        createEnemy.call(this,
            Phaser.Math.Between(50, WORLD_SIZE-50),
            Phaser.Math.Between(50, WORLD_SIZE-50)
        );
    }
}

// 在創建敵人時使用新的名字生成函數
function createEnemy(x, y) {
    const enemy = this.add.circle(x, y, 20, 0x0000ff);
    this.physics.add.existing(enemy);
    enemy.body.setCollideWorldBounds(true);
    enemy.mass = 10;
    enemy.radius = Math.sqrt(enemy.mass) * 4;
    enemy.setRadius(enemy.radius);
    enemy.target = null;
    enemy.name = getRandomName();
    enemies.push(enemy);
    return enemy;
} 