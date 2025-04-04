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

// 在全局變量中添加
let specialEnemyTimer = 0;
let specialEnemySpawnInterval = 60000; // 60秒

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
    for (let i = 0; i < 20; i++) {
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

    // 添加操作說明文字（移至左下角）
    const controlsText = this.add.text(16, config.height - 100, 
        '操作說明：\n' +
        '滑鼠：移動\n' +
        '空格：分裂(必須大於100分)\n' +
        'W：噴射質量',
        { 
            fontSize: '16px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: '#00000080',
            padding: { x: 10, y: 5 },
            align: 'left'
        }
    );
    controlsText.setScrollFactor(0);
    controlsText.setDepth(1000);

    // 初始化排行榜
    updateLeaderboard();

    // 初始化特殊敵人計時器
    specialEnemyTimer = this.time.now;
}

function update() {
    // 處理玩家移動
    playerPieces.forEach(piece => {
        // 根據質量計算速度，質量越大速度越慢
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

    // 玩家控制
    if (playerPieces.length > 0) {
        const pointer = this.input.activePointer;
        
        // 所有玩家碎片都朝向滑鼠移動
        playerPieces.forEach(piece => {
            const angle = Phaser.Math.Angle.Between(
                piece.x,
                piece.y,
                pointer.worldX,
                pointer.worldY
            );
            
            const speed = 400 / Math.sqrt(piece.mass);
            piece.body.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
        });
        
        // 分裂控制
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('SPACE'))) {
            playerPieces.forEach(piece => {
                if (piece.mass > 100) {
                    splitPlayer.call(this, piece);
                }
            });
        }
        
        // 噴射控制（每次只噴射一個最小圓）
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('W')) && playerPieces[0].mass > 10) {
            ejectMass.call(this, playerPieces[0]);
        }
    }

    // 檢查是否需要生成特殊敵人
    if (this.time.now - specialEnemyTimer >= specialEnemySpawnInterval) {
        // 在玩家附近生成特殊敵人
        const angle = Math.random() * Math.PI * 2;
        const distance = 300;
        const x = player.x + Math.cos(angle) * distance;
        const y = player.y + Math.sin(angle) * distance;
        
        createEnemy.call(this, x, y, true);
        specialEnemyTimer = this.time.now;
    }

    // 更新敵人 AI
    enemies.forEach(enemy => {
        const baseSpeed = 400;
        const speed = baseSpeed / Math.sqrt(enemy.mass) * 0.8;
        
        let nearestTarget = null;
        let minDistance = Infinity;
        let shouldFlee = false;
        let fleeTarget = null;
        let fleeDirection = null;
        let isCornered = false;
        let allyFound = false;
        let allyTarget = null;

        // 檢查是否在牆角
        const margin = 100;
        isCornered = (enemy.x < margin || enemy.x > WORLD_SIZE - margin) && 
                    (enemy.y < margin || enemy.y > WORLD_SIZE - margin);

        // 檢查是否有更大的圓在追趕
        playerPieces.forEach(piece => {
            if (piece.mass > enemy.mass * 1.1) {
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    piece.x, piece.y
                );
                if (distance < 300) {
                    shouldFlee = true;
                    fleeTarget = piece;
                    minDistance = distance;
                    
                    // 計算逃離方向
                    const angleToTarget = Phaser.Math.Angle.Between(
                        enemy.x, enemy.y,
                        piece.x, piece.y
                    );
                    
                    if (isCornered) {
                        // 計算到最近邊界的距離
                        const distToLeft = enemy.x;
                        const distToRight = WORLD_SIZE - enemy.x;
                        const distToTop = enemy.y;
                        const distToBottom = WORLD_SIZE - enemy.y;
                        
                        const maxDist = Math.max(distToLeft, distToRight, distToTop, distToBottom);
                        if (maxDist === distToLeft) {
                            fleeDirection = Math.PI;
                        } else if (maxDist === distToRight) {
                            fleeDirection = 0;
                        } else if (maxDist === distToTop) {
                            fleeDirection = -Math.PI/2;
                        } else {
                            fleeDirection = Math.PI/2;
                        }
                    } else {
                        // 正常情況下的逃跑方向
                        fleeDirection = angleToTarget + Math.PI;
                    }
                }
            }
        });

        // 尋找最近的較小圓（優先順序：玩家碎片 > 其他敵人 > 綠色小圓）
        let targetFound = false;
        
        // 檢查玩家碎片
        playerPieces.forEach(piece => {
            if (piece.mass < enemy.mass * 0.9) {
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    piece.x, piece.y
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestTarget = piece;
                    targetFound = true;
                }
            }
        });

        // 檢查其他敵人
        if (!targetFound) {
            enemies.forEach(otherEnemy => {
                if (otherEnemy !== enemy) {
                    const distance = Phaser.Math.Distance.Between(
                        enemy.x, enemy.y,
                        otherEnemy.x, otherEnemy.y
                    );
                    
                    // 檢查是否可以合作攻擊
                    if (otherEnemy.mass < enemy.mass * 0.9) {
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestTarget = otherEnemy;
                            targetFound = true;
                        }
                    } else if (otherEnemy.mass > enemy.mass * 0.9 && otherEnemy.mass < enemy.mass * 1.1) {
                        // 找到盟友
                        allyFound = true;
                        allyTarget = otherEnemy;
                    }
                }
            });
        }

        // 檢查綠色小圓
        if (!targetFound) {
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
        }

        // 特殊敵人的行為
        if (enemy.isSpecial) {
            // 只追蹤玩家
            const angle = Phaser.Math.Angle.Between(
                enemy.x, enemy.y,
                player.x, player.y
            );
            enemy.body.setVelocity(
                Math.cos(angle) * speed * 1.2, // 特殊敵人移動速度更快
                Math.sin(angle) * speed * 1.2
            );
            
            // 更新特殊敵人的顏色
            enemy.fillColor = Phaser.Math.Between(0x000000, 0xffffff);
            enemy.setFillStyle(enemy.fillColor);
        } else {
            // 移動敵人
            if (shouldFlee && fleeDirection !== null) {
                const fleeSpeed = speed * (isCornered ? 1.1 : 0.9);
                
                // 使用線性插值來平滑速度變化
                const currentAngle = Math.atan2(enemy.body.velocity.y, enemy.body.velocity.x);
                const targetAngle = fleeDirection;
                const angleDiff = Phaser.Math.Angle.ShortestBetween(currentAngle, targetAngle);
                
                // 添加最小轉向角度閾值，避免原地自轉
                const minAngleChange = 0.1;
                if (Math.abs(angleDiff) > minAngleChange) {
                    const newAngle = currentAngle + angleDiff * 0.05;
                    enemy.body.setVelocity(
                        Math.cos(newAngle) * fleeSpeed,
                        Math.sin(newAngle) * fleeSpeed
                    );
                }
            } else if (nearestTarget) {
                // 追趕最近的目標
                const angle = Phaser.Math.Angle.Between(
                    enemy.x, enemy.y,
                    nearestTarget.x, nearestTarget.y
                );
                enemy.body.setVelocity(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                );
            } else if (allyFound && allyTarget) {
                // 與盟友合作
                const angle = Phaser.Math.Angle.Between(
                    enemy.x, enemy.y,
                    allyTarget.x, allyTarget.y
                );
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    allyTarget.x, allyTarget.y
                );
                
                // 保持適當距離
                if (distance > 200) {
                    enemy.body.setVelocity(
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed
                    );
                } else if (distance < 100) {
                    enemy.body.setVelocity(
                        Math.cos(angle + Math.PI) * speed,
                        Math.sin(angle + Math.PI) * speed
                    );
                } else {
                    enemy.body.setVelocity(0, 0);
                }
            } else {
                // 如果沒有目標，隨機移動
                const randomAngle = Math.random() * Math.PI * 2;
                enemy.body.setVelocity(
                    Math.cos(randomAngle) * speed,
                    Math.sin(randomAngle) * speed
                );
            }
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
                
                // 移除敵人和它的名字標籤
                if (enemy.nameText) {
                    enemy.nameText.destroy();
                }
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

    // 更新分數（根據所有玩家碎片的總質量）
    let totalMass = 0;
    playerPieces.forEach(piece => {
        totalMass += piece.mass;
    });
    score = Math.floor(totalMass);
    scoreText.setText('分數: ' + score);
    updateLeaderboard();
}

function splitPlayer(piece) {
    if (piece.mass >= 35) {
        // 計算分裂後的質量
        const splitMass = Math.floor(piece.mass / 2);
        
        // 創建新碎片
        const newPiece = this.add.circle(
            piece.x,
            piece.y,
            Math.sqrt(splitMass) * 4,
            0xff0000
        );
        this.physics.add.existing(newPiece);
        newPiece.body.setCollideWorldBounds(true);
        newPiece.mass = splitMass;
        newPiece.radius = Math.sqrt(newPiece.mass) * 4;
        newPiece.setRadius(newPiece.radius);
        
        // 計算分裂方向（朝向滑鼠）
        const angle = Phaser.Math.Angle.Between(
            piece.x,
            piece.y,
            this.input.mousePointer.worldX,
            this.input.mousePointer.worldY
        );
        
        // 計算到鼠標的距離並增加10倍
        const distance = Phaser.Math.Distance.Between(
            piece.x,
            piece.y,
            this.input.mousePointer.worldX,
            this.input.mousePointer.worldY
        ) * 10;
        
        // 設置初始速度，確保在0.1秒內到達目標距離
        const initialSpeed = distance / 0.1;
        newPiece.body.setVelocity(
            Math.cos(angle) * initialSpeed,
            Math.sin(angle) * initialSpeed
        );
        
        // 0.1秒後恢復正常速度
        this.time.delayedCall(100, () => {
            if (newPiece.active) {
                const normalSpeed = 400 / Math.sqrt(newPiece.mass) * 0.8;
                newPiece.body.setVelocity(
                    Math.cos(angle) * normalSpeed,
                    Math.sin(angle) * normalSpeed
                );
            }
        });
        
        // 更新原碎片的質量
        piece.mass = splitMass;
        piece.radius = Math.sqrt(piece.mass) * 4;
        piece.setRadius(piece.radius);
        
        // 添加新碎片到玩家碎片列表
        playerPieces.push(newPiece);
        
        // 計算合併冷卻時間
        const mergeCooldown = 30000 + (piece.mass * 10);
        
        // 設置合併冷卻時間
        this.time.delayedCall(mergeCooldown, () => {
            if (newPiece.active && piece.active) {
                // 合併質量
                piece.mass += newPiece.mass;
                piece.radius = Math.sqrt(piece.mass) * 4;
                piece.setRadius(piece.radius);
                
                // 移除新碎片
                newPiece.destroy();
                playerPieces = playerPieces.filter(p => p !== newPiece);
            }
        });
    }
}

function ejectMass(piece) {
    // 創建噴射的質量（最小大小為1分）
    const mass = this.add.circle(
        piece.x,
        piece.y,
        Math.sqrt(1) * 4,
        0xff0000
    );
    this.physics.add.existing(mass);
    mass.mass = 1; // 設置質量
    mass.radius = Math.sqrt(mass.mass) * 4;
    mass.setRadius(mass.radius);
    
    // 設置噴射方向（朝向滑鼠方向）
    const angle = Phaser.Math.Angle.Between(
        piece.x,
        piece.y,
        this.input.mousePointer.worldX,
        this.input.mousePointer.worldY
    );
    const speed = 400;
    mass.body.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
    );
    
    // 減少玩家質量（固定減少1分）
    piece.mass -= 1;
    piece.radius = Math.sqrt(piece.mass) * 4;
    piece.setRadius(piece.radius);
    
    // 檢查所有圓是否可以吸收這個小圓
    const checkAbsorption = () => {
        if (!mass.active) return;
        
        // 檢查玩家碎片
        playerPieces.forEach(p => {
            if (p !== piece && Phaser.Math.Distance.Between(
                p.x, p.y,
                mass.x, mass.y
            ) < p.radius) {
                p.mass += mass.mass;
                p.radius = Math.sqrt(p.mass) * 4;
                p.setRadius(p.radius);
                mass.destroy();
            }
        });
        
        // 檢查敵人
        enemies.forEach(e => {
            if (Phaser.Math.Distance.Between(
                e.x, e.y,
                mass.x, mass.y
            ) < e.radius) {
                e.mass += mass.mass;
                e.radius = Math.sqrt(e.mass) * 4;
                e.setRadius(e.radius);
                mass.destroy();
            }
        });
    };
    
    // 每幀檢查是否可以吸收
    this.events.on('update', checkAbsorption);
    
    // 3秒後移除噴射的質量
    this.time.delayedCall(3000, () => {
        if (mass.active) {
            mass.destroy();
            this.events.off('update', checkAbsorption);
        }
    });
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
    for (let i = 0; i < 20; i++) {
        createEnemy.call(this,
            Phaser.Math.Between(50, WORLD_SIZE-50),
            Phaser.Math.Between(50, WORLD_SIZE-50)
        );
    }
}

// 在創建敵人時使用新的名字生成函數
function createEnemy(x, y, isSpecial = false) {
    // 創建圓形
    const enemy = this.add.circle(x, y, 20, isSpecial ? 0xffffff : Phaser.Math.Between(0x000000, 0xffffff));
    this.physics.add.existing(enemy);
    enemy.body.setCollideWorldBounds(true);
    enemy.mass = 10;
    enemy.radius = Math.sqrt(enemy.mass) * 4;
    enemy.setRadius(enemy.radius);
    enemy.name = getRandomName();
    enemy.isSpecial = isSpecial;
    
    // 如果是特殊敵人，設置為彩色
    if (isSpecial) {
        enemy.fillColor = 0xffffff;
        enemy.setStrokeStyle(2, 0xff0000);
    }
    
    enemies.push(enemy);
    return enemy;
}

function ejectEnemyMass(enemy) {
    if (enemy.mass > 10) {
        // 創建噴射的質量
        const mass = this.add.circle(
            enemy.x,
            enemy.y,
            Math.sqrt(1) * 4,
            enemy.fillColor
        );
        this.physics.add.existing(mass);
        mass.mass = 1;
        mass.radius = Math.sqrt(mass.mass) * 4;
        mass.setRadius(mass.radius);
        
        // 設置噴射方向（隨機方向）
        const angle = Math.random() * Math.PI * 2;
        const speed = 400;
        mass.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
        
        // 減少敵人質量
        enemy.mass -= 1;
        enemy.radius = Math.sqrt(enemy.mass) * 4;
        enemy.setRadius(enemy.radius);
        
        // 3秒後移除噴射的質量
        this.time.delayedCall(3000, () => {
            if (mass.active) {
                mass.destroy();
            }
        });
    }
} 