const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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

const game = new Phaser.Game(config);

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
const WORLD_SIZE = 2000; // 世界大小

// 創建波動圓形
function createWavyCircle(scene, x, y, radius, color) {
    const graphics = scene.add.graphics();
    const points = [];
    const segments = 32;
    const time = scene.time.now;
    
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const wave = Math.sin(time * 0.002 + angle * 3) * 2;
        const r = radius + wave;
        points.push({
            x: x + Math.cos(angle) * r,
            y: y + Math.sin(angle) * r
        });
    }
    
    graphics.clear();
    graphics.lineStyle(2, color);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
    }
    
    graphics.closePath();
    graphics.strokePath();
    
    return graphics;
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
    player = this.add.graphics();
    player.x = WORLD_SIZE/2;
    player.y = WORLD_SIZE/2;
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.mass = 10;
    player.radius = Math.sqrt(player.mass) * 4;
    player.color = 0xff0000;
    playerPieces.push(player);

    // 創建敵人（藍色圓形）
    for (let i = 0; i < 5; i++) {
        const enemy = this.add.graphics();
        enemy.x = Phaser.Math.Between(50, WORLD_SIZE-50);
        enemy.y = Phaser.Math.Between(50, WORLD_SIZE-50);
        this.physics.add.existing(enemy);
        enemy.body.setCollideWorldBounds(true);
        enemy.mass = 10;
        enemy.radius = Math.sqrt(enemy.mass) * 4;
        enemy.color = 0x0000ff;
        enemy.target = null;
        enemies.push(enemy);
    }

    // 創建食物（綠色圓形）
    for (let i = 0; i < 50; i++) {
        const food = this.add.graphics();
        food.x = Phaser.Math.Between(50, WORLD_SIZE-50);
        food.y = Phaser.Math.Between(50, WORLD_SIZE-50);
        this.physics.add.existing(food);
        food.radius = 5;
        food.color = 0x00ff00;
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
    scoreText = this.add.text(16, 16, '分數: 0', { fontSize: '32px', fill: '#000' });
    scoreText.setScrollFactor(0); // 讓分數固定在畫面上
}

function update() {
    // 更新玩家波動效果
    playerPieces.forEach(piece => {
        const points = [];
        const segments = 32;
        const time = this.time.now;
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const wave = Math.sin(time * 0.002 + angle * 3) * 10;
            const r = piece.radius + wave;
            points.push({
                x: piece.x + Math.cos(angle) * r,
                y: piece.y + Math.sin(angle) * r
            });
        }
        
        piece.clear();
        piece.lineStyle(2, piece.color);
        piece.beginPath();
        piece.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            piece.lineTo(points[i].x, points[i].y);
        }
        
        piece.closePath();
        piece.strokePath();
    });

    // 更新敵人波動效果
    enemies.forEach(enemy => {
        const points = [];
        const segments = 32;
        const time = this.time.now;
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const wave = Math.sin(time * 0.002 + angle * 3) * 10;
            const r = enemy.radius + wave;
            points.push({
                x: enemy.x + Math.cos(angle) * r,
                y: enemy.y + Math.sin(angle) * r
            });
        }
        
        enemy.clear();
        enemy.lineStyle(2, enemy.color);
        enemy.beginPath();
        enemy.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            enemy.lineTo(points[i].x, points[i].y);
        }
        
        enemy.closePath();
        enemy.strokePath();
    });

    // 更新食物波動效果
    foods.forEach(food => {
        const points = [];
        const segments = 32;
        const time = this.time.now;
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const wave = Math.sin(time * 0.002 + angle * 3) * 5;
            const r = food.radius + wave;
            points.push({
                x: food.x + Math.cos(angle) * r,
                y: food.y + Math.sin(angle) * r
            });
        }
        
        food.clear();
        food.lineStyle(1, food.color);
        food.beginPath();
        food.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            food.lineTo(points[i].x, points[i].y);
        }
        
        food.closePath();
        food.strokePath();
    });

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

    // 檢查碰撞
    // 玩家吃食物
    playerPieces.forEach(piece => {
        foods.forEach((food, index) => {
            if (Phaser.Math.Distance.Between(
                piece.x, piece.y,
                food.x, food.y
            ) < piece.radius) {
                // 增加玩家大小
                piece.mass += 2; // 增加更多質量
                piece.radius = Math.sqrt(piece.mass) * 4;
                piece.setRadius(piece.radius);
                
                // 更新分數
                score += 10;
                scoreText.setText('分數: ' + score);
                
                // 移除食物
                food.destroy();
                foods.splice(index, 1);
                
                // 創建新的食物
                const newFood = this.add.graphics();
                newFood.x = Phaser.Math.Between(50, WORLD_SIZE-50);
                newFood.y = Phaser.Math.Between(50, WORLD_SIZE-50);
                this.physics.add.existing(newFood);
                newFood.radius = 5;
                newFood.color = 0x00ff00;
                foods.push(newFood);
            }
        });
    });

    // 敵人吃食物
    enemies.forEach(enemy => {
        foods.forEach((food, index) => {
            if (Phaser.Math.Distance.Between(
                enemy.x, enemy.y,
                food.x, food.y
            ) < enemy.radius) {
                // 增加敵人大小
                enemy.mass += 2; // 增加更多質量
                enemy.radius = Math.sqrt(enemy.mass) * 4;
                enemy.setRadius(enemy.radius);
                
                // 移除食物
                food.destroy();
                foods.splice(index, 1);
                
                // 創建新的食物
                const newFood = this.add.graphics();
                newFood.x = Phaser.Math.Between(50, WORLD_SIZE-50);
                newFood.y = Phaser.Math.Between(50, WORLD_SIZE-50);
                this.physics.add.existing(newFood);
                newFood.radius = 5;
                newFood.color = 0x00ff00;
                foods.push(newFood);
            }
        });

        // 檢查玩家是否被敵人吃掉
        playerPieces.forEach((piece, pieceIndex) => {
            if (enemy.mass > piece.mass * 1.1 && 
                Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    piece.x, piece.y
                ) < enemy.radius) {
                // 敵人吃掉玩家
                enemy.mass += piece.mass * 0.8;
                piece.destroy();
                playerPieces.splice(pieceIndex, 1);
                
                // 如果所有玩家碎片都被吃掉，重新開始
                if (playerPieces.length === 0) {
                    resetGame();
                }
            }
        });

        // 檢查敵人是否被玩家吃掉
        if (playerPieces.some(piece => piece.mass > enemy.mass * 1.1) &&
            playerPieces.some(piece => 
                Phaser.Math.Distance.Between(
                    piece.x, piece.y,
                    enemy.x, enemy.y
                ) < piece.radius
            )) {
            // 玩家吃掉敵人
            playerPieces.forEach(piece => {
                if (piece.mass > enemy.mass * 1.1) {
                    piece.mass += enemy.mass * 0.8;
                    score += 50;
                    scoreText.setText('分數: ' + score);
                }
            });
            
            // 重新生成敵人
            enemy.destroy();
            const newEnemy = this.add.graphics();
            newEnemy.x = Phaser.Math.Between(50, WORLD_SIZE-50);
            newEnemy.y = Phaser.Math.Between(50, WORLD_SIZE-50);
            this.physics.add.existing(newEnemy);
            newEnemy.body.setCollideWorldBounds(true);
            newEnemy.mass = 10;
            newEnemy.radius = Math.sqrt(newEnemy.mass) * 4;
            newEnemy.color = 0x0000ff;
            enemies.push(newEnemy);
        }
    });
}

function splitPlayer() {
    // 只有當玩家質量足夠大時才能分裂
    if (playerPieces[0].mass >= 20) {
        const newPiece = this.add.graphics();
        newPiece.x = playerPieces[0].x;
        newPiece.y = playerPieces[0].y;
        this.physics.add.existing(newPiece);
        newPiece.body.setCollideWorldBounds(true);
        newPiece.mass = playerPieces[0].mass / 2;
        newPiece.radius = Math.sqrt(newPiece.mass) * 4;
        newPiece.color = 0xff0000;
        
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
        const mass = this.add.graphics();
        mass.x = playerPieces[0].x;
        mass.y = playerPieces[0].y;
        this.physics.add.existing(mass);
        mass.mass = 5;
        mass.color = 0xff0000;
        
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
    player = this.add.graphics();
    player.x = WORLD_SIZE/2;
    player.y = WORLD_SIZE/2;
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.mass = 10;
    player.radius = Math.sqrt(player.mass) * 4;
    player.color = 0xff0000;
    playerPieces = [player];
    
    // 重置分數
    score = 0;
    scoreText.setText('分數: ' + score);
    
    // 重置相機
    camera.startFollow(player, true, 0.1, 0.1);
} 