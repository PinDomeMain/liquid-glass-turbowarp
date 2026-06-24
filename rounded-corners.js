/**
 * Rounded Corners Extension for Turbowarp
 * 角丸拡張機能
 */

class RoundedCornersExtension {
  constructor(runtime) {
    this.runtime = runtime;
    this.costumesBackup = new Map();
  }

  getInfo() {
    return {
      id: 'roundedcorners',
      name: '角丸',
      description: 'Apply rounded corners to costumes',
      blocks: [
        {
          opcode: 'applyCostumeRounding',
          blockType: Scratch.BlockType.COMMAND,
          text: 'コスチューム [COSTUME] を [RADIUS] px の角丸でかける',
          arguments: {
            COSTUME: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: '1'
            },
            RADIUS: {
              type: Scratch.ArgumentType.NUMBER,
              defaultValue: 10
            }
          }
        },
        {
          opcode: 'resetCostumeRounding',
          blockType: Scratch.BlockType.COMMAND,
          text: 'コスチューム [COSTUME] の角丸をリセット',
          arguments: {
            COSTUME: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: '1'
            }
          }
        }
      ]
    };
  }

  applyCostumeRounding(args) {
    const target = this.runtime.editingTarget;
    if (!target || !target.costumes) {
      return;
    }

    const costumeIndex = this._getCostumeIndex(args.COSTUME, target);
    if (costumeIndex === null) {
      return;
    }

    const costume = target.costumes[costumeIndex];
    const radius = Math.max(0, args.RADIUS);

    // コスチュームの画像データを取得
    const renderer = this.runtime.renderer;
    const skinId = costume.skinId;

    if (skinId === undefined) {
      return;
    }

    // キャンバスを作成して画像を描画
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // コスチュームのサイズを設定
    const width = costume.width || 100;
    const height = costume.height || 100;

    canvas.width = width;
    canvas.height = height;

    // レンダラーから画像を取得して描画
    try {
      renderer.requestSnapshot(skinId, (snapshot) => {
        if (!snapshot) return;

        const img = new Image();
        img.onload = () => {
          // バックアップを保存
          const backupKey = `${target.id}_${costume.name}`;
          if (!this.costumesBackup.has(backupKey)) {
            canvas.toBlob((originalBlob) => {
              this.costumesBackup.set(backupKey, originalBlob);
            });
          }

          // 角丸処理を適用
          const roundCanvas = document.createElement('canvas');
          roundCanvas.width = img.width;
          roundCanvas.height = img.height;
          const roundCtx = roundCanvas.getContext('2d');

          // 角丸パスを作成
          roundCtx.beginPath();
          this._roundRect(roundCtx, 0, 0, roundCanvas.width, roundCanvas.height, radius);
          roundCtx.clip();

          // 画像を描画
          roundCtx.drawImage(img, 0, 0);

          // 新しい画像をコスチュームに設定
          roundCanvas.toBlob((blob) => {
            this._updateCostume(costume, blob, target);
          }, 'image/png');
        };

        img.src = snapshot;
      });
    } catch (e) {
      console.error('Error applying rounding:', e);
    }
  }

  resetCostumeRounding(args) {
    const target = this.runtime.editingTarget;
    if (!target || !target.costumes) {
      return;
    }

    const costumeIndex = this._getCostumeIndex(args.COSTUME, target);
    if (costumeIndex === null) {
      return;
    }

    const costume = target.costumes[costumeIndex];
    const backupKey = `${target.id}_${costume.name}`;

    if (this.costumesBackup.has(backupKey)) {
      const backupBlob = this.costumesBackup.get(backupKey);
      this._updateCostume(costume, backupBlob, target);
      this.costumesBackup.delete(backupKey);
    }
  }

  _getCostumeIndex(costumeInput, target) {
    const input = String(costumeInput).toLowerCase().trim();

    // 数値で指定された場合
    if (!isNaN(input)) {
      const index = parseInt(input) - 1;
      if (index >= 0 && index < target.costumes.length) {
        return index;
      }
    }

    // 名前で検索
    for (let i = 0; i < target.costumes.length; i++) {
      if (target.costumes[i].name.toLowerCase() === input) {
        return i;
      }
    }

    return target.currentCostumeIndex;
  }

  _updateCostume(costume, blob, target) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target.result;
      costume.asset = {
        data: arrayBuffer,
        dataFormat: 'png'
      };

      // コスチュームを再設定
      const index = target.costumes.indexOf(costume);
      if (index !== -1) {
        target.setCostume(index);
      }
    };
    reader.readAsArrayBuffer(blob);
  }

  _roundRect(ctx, x, y, width, height, radius) {
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

// Turbowarpへの登録
Scratch.extensions.register(new RoundedCornersExtension(Scratch.vm.runtime));
