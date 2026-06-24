const BlockType = require('block-type');
const Color = require('color');

class RoundedCornersExtension {
  constructor(runtime) {
    this.runtime = runtime;
    this.costumes = new Map();
  }

  getInfo() {
    return {
      id: 'roundedCorners',
      name: 'Rounded Corners',
      blocks: [
        {
          opcode: 'applyCostumeRounding',
          blockType: BlockType.COMMAND,
          text: 'コスチューム [COSTUME_MENU] に [RADIUS] px の角丸をかける',
          arguments: {
            COSTUME_MENU: {
              type: 'string',
              menu: 'costumeMenu',
              defaultValue: ''
            },
            RADIUS: {
              type: 'number',
              defaultValue: 10
            }
          }
        },
        {
          opcode: 'resetCostumeRounding',
          blockType: BlockType.COMMAND,
          text: 'コスチューム [COSTUME_MENU] の角丸をリセット',
          arguments: {
            COSTUME_MENU: {
              type: 'string',
              menu: 'costumeMenu',
              defaultValue: ''
            }
          }
        }
      ],
      menus: {
        costumeMenu: {
          acceptReporters: true,
          items: this.getCostumeMenu()
        }
      }
    };
  }

  getCostumeMenu() {
    const vm = this.runtime.vm || this.runtime;
    const sprite = vm.editingTarget || vm.runtime.currentTarget;
    
    if (!sprite || !sprite.costumes) {
      return [''];
    }

    return sprite.costumes.map((costume, index) => ({
      text: costume.name,
      value: index.toString()
    }));
  }

  applyCostumeRounding(args) {
    const vm = this.runtime.vm || this.runtime;
    const sprite = vm.editingTarget || vm.runtime.currentTarget;
    
    if (!sprite || !sprite.costumes) {
      return;
    }

    const costumeIndex = parseInt(args.COSTUME_MENU);
    const radius = Math.max(0, args.RADIUS);
    const costume = sprite.costumes[costumeIndex];

    if (!costume) {
      return;
    }

    // 元のコスチュームを保存（初回のみ）
    const costumeName = costume.name;
    if (!this.costumes.has(costumeName)) {
      this.costumes.set(costumeName, {
        original: costume.asset,
        rotationCenter: costume.rotationCenterX + ',' + costume.rotationCenterY
      });
    }

    // Canvas を使って角丸処理
    const originalAsset = this.costumes.get(costumeName).original;
    const image = new Image();
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      
      const ctx = canvas.getContext('2d');
      
      // パスを描画
      ctx.beginPath();
      this.roundRect(ctx, 0, 0, canvas.width, canvas.height, radius);
      ctx.clip();
      
      // 画像を描画
      ctx.drawImage(image, 0, 0);
      
      // 新しいアセットに変換
      canvas.toBlob((blob) => {
        const newAsset = new File([blob], 'rounded_' + costumeName + '.png', { type: 'image/png' });
        costume.asset = newAsset;
        
        // レンダリング更新
        if (sprite.renderer) {
          sprite.renderer.updateCostume(costume);
        }
      });
    };
    
    image.src = URL.createObjectURL(originalAsset);
  }

  resetCostumeRounding(args) {
    const vm = this.runtime.vm || this.runtime;
    const sprite = vm.editingTarget || vm.runtime.currentTarget;
    
    if (!sprite || !sprite.costumes) {
      return;
    }

    const costumeIndex = parseInt(args.COSTUME_MENU);
    const costume = sprite.costumes[costumeIndex];

    if (!costume) {
      return;
    }

    const costumeName = costume.name;
    if (this.costumes.has(costumeName)) {
      const stored = this.costumes.get(costumeName);
      costume.asset = stored.original;
      
      if (sprite.renderer) {
        sprite.renderer.updateCostume(costume);
      }
      
      this.costumes.delete(costumeName);
    }
  }

  // 角丸矩形のパスを描画
  roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

module.exports = RoundedCornersExtension;
