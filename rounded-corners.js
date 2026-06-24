(function(Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Rounded Corners Extension requires unsandboxed mode');
  }

  class RoundedCornersExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.costumesBackup = new Map();
    }

    getInfo() {
      return {
        id: 'roundedCorners',
        name: '角丸',
        blockIconURI: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiMwMDAwMDAiIGZpbGwtb3BhY2l0eT0iMC4yIiByeD0iOCIgcnk9IjgiLz48L3N2Zz4=',
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

      // バックアップを保存（初回のみ）
      const backupKey = `${target.id}_${costume.name}`;
      if (!this.costumesBackup.has(backupKey)) {
        this.costumesBackup.set(backupKey, {
          assetId: costume.assetId,
          md5: costume.md5,
          dataFormat: costume.dataFormat
        });
      }

      // 画像を取得して処理
      this._processImage(costume, radius, target, backupKey);
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
        const backup = this.costumesBackup.get(backupKey);
        costume.assetId = backup.assetId;
        costume.md5 = backup.md5;
        costume.dataFormat = backup.dataFormat;

        target.setCostume(costumeIndex);
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

    _processImage(costume, radius, target, backupKey) {
      const runtime = this.runtime;
      
      // コスチュームの画像データを取得
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 既存のレンダラーから画像を取得する方法
      if (costume.skinId !== undefined) {
        // Scratch のレンダラーを使用して画像を取得
        const renderer = runtime.renderer;
        
        // 別のキャンバスに描画
        const tempCanvas = document.createElement('canvas');
        
        // コスチュームのサイズを取得
        const width = costume.width || 100;
        const height = costume.height || 100;
        
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        const tempCtx = tempCanvas.getContext('2d');
        
        // 画像を描画（レンダラーから取得）
        try {
          // SVG または PNG などのアセットを取得
          if (costume.asset && costume.asset.data) {
            const blob = new Blob([costume.asset.data], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            
            img.onload = () => {
              this._applyRounding(img, tempCanvas, radius, costume, target);
              URL.revokeObjectURL(url);
            };
            
            img.onerror = () => {
              console.error('Failed to load costume image');
            };
            
            img.src = url;
          }
        } catch (e) {
          console.error('Error processing costume:', e);
        }
      }
    }

    _applyRounding(image, canvas, radius, costume, target) {
      canvas.width = image.width;
      canvas.height = image.height;
      
      const ctx = canvas.getContext('2d');
      
      // 角丸パスを作成
      ctx.beginPath();
      this._roundRect(ctx, 0, 0, canvas.width, canvas.height, radius);
      ctx.clip();
      
      // 画像を描画
      ctx.drawImage(image, 0, 0);
      
      // キャンバスを blob に変換
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          // アセットを更新
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
      }, 'image/png');
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

  Scratch.extensions.register(new RoundedCornersExtension(Scratch.vm.runtime));
})(Scratch);
