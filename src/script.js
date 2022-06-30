window.MS = (function () {
  // 画布对象
  let _msCanvas = null;

  /**
   * 错误处理
   * @param {object} error 错误对象
   */
  const _handleError = function (error) {
    alert(error.message || "未知错误");
  };

  /**
   * 加载图片资源
   */
  const _loadImages = async function () {
    // 待加载的图片
    const images = {
      number0: "../imgs/numbers/0.bmp",
      number1: "../imgs/numbers/1.bmp",
      number2: "../imgs/numbers/2.bmp",
      number3: "../imgs/numbers/3.bmp",
      number4: "../imgs/numbers/4.bmp",
      number5: "../imgs/numbers/5.bmp",
      number6: "../imgs/numbers/6.bmp",
      number7: "../imgs/numbers/7.bmp",
      number8: "../imgs/numbers/8.bmp",
      mine: "../imgs/grids/mine.bmp",
      burst: "../imgs/grids/burst.bmp",
      flag: "../imgs/grids/flag.bmp",
      closed: "../imgs/grids/closed.bmp",
      hover: "../imgs/grids/hover.bmp",
    };

    // 构造Promis
    const promiseList = [];
    Object.keys(images).forEach((key) => {
      const imageSrc = images[key];
      promiseList.push(
        new Promise((resolve) => {
          const image = new Image();
          image.src = imageSrc;
          image.onload = () => {
            images[key] = image;
            resolve();
          };
        })
      );
    });

    // 并行加载
    await Promise.all(promiseList);

    return images;
  };

  /**
   * 处理画布大小改变事件
   * @param {integer} width 改变后的宽度
   */
  const _handleCanvasResize = function (width) {
    // 获取扫雷窗口元素
    const msWinEle = document.getElementsByClassName("ms-window")[0];

    // 重设扫雷窗口宽度
    msWinEle.style.width = `${width + 25}px`;
  };

  /**
   * 处理游戏结束事件
   */
  const _handleGameOver = function () {
    // 设置失败表情
    const [img] = document.querySelectorAll(".face img");
    img.src = "../imgs/faces/fail.bmp";

    setTimeout(() => {
      alert("游戏结束");
    }, 100);
  };

  /**
   * 处理游戏获胜事件
   */
  const _handleGameWin = function () {
    // 设置胜利表情
    const [img] = document.querySelectorAll(".face img");
    img.src = "../imgs/faces/success.bmp";

    setTimeout(() => {
      alert("恭喜您获胜了");
    }, 100);
  };

  /**
   * 更新指示牌 对应的图片
   */
  const _updateIndicator = function (img1, img2, img3, num) {
    // 字符长度
    const len = `${num}`.length;

    // 百位数
    const hundreds = len < 3 ? 0 : `${num}`.substring(len - 3, len - 2);

    // 十位数
    const tens = len < 2 ? 0 : `${num}`.substring(len - 2, len - 1);

    // 个位数
    const units = `${num}`.substring(len - 1);

    // 更新图片
    img1.src = `../imgs/liquid-crystal-numbers/${hundreds}.bmp`;
    img2.src = `../imgs/liquid-crystal-numbers/${tens}.bmp`;
    img3.src = `../imgs/liquid-crystal-numbers/${units}.bmp`;
  };

  /**
   * 处理旗子数变化事件
   * @param {number} flagNum 旗子数
   * @param {number} mineNum 地雷数
   */
  const _handleFlagNumChange = function (flagNum, mineNum) {
    // 剩余地雷数
    const remaining = flagNum > mineNum ? 0 : mineNum - flagNum;

    // 获取图片元素
    const [img1, img2, img3] = document.querySelectorAll(".remaining img");

    // 更新指示牌
    _updateIndicator(img1, img2, img3, remaining);
  };

  /**
   * 处理游戏心跳事件
   * @param {number} duration 游戏持续时长
   */
  const _handleHeartbeat = function (duration) {
    // 获取图片元素
    const [img1, img2, img3] = document.querySelectorAll(".time img");

    // 更新指示牌
    _updateIndicator(img1, img2, img3, duration);
  };

  /**
   * 打开新页面
   * @param {string} href
   */
  const _openPage = function (href) {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.click();
  };

  return {
    /**
     * 开始游戏
     */
    start: async function () {
      try {
        if (!MSCanvas) throw new Error("加载画布工具失败");

        // 加载图片
        const images = await _loadImages();

        // 实例化画布对象
        _msCanvas = new MSCanvas("ms-canvas", {
          images,
          resize: _handleCanvasResize,
          gameOver: _handleGameOver,
          gameWin: _handleGameWin,
          flagNumChange: _handleFlagNumChange,
          heartbeat: _handleHeartbeat,
        });
      } catch (error) {
        _handleError(error);
      }
    },

    /**
     * 重新开始游戏
     * @param {string} level 难度等级
     */
    restart: function (level) {
      try {
        const config = {};

        // 根据类型调整配置
        if (level === "easy") {
          config.rowNum = 9;
          config.colNum = 9;
          config.mineNum = 10;
        } else if (level === "medium") {
          config.rowNum = 16;
          config.colNum = 16;
          config.mineNum = 40;
        } else if (level === "difficult") {
          config.rowNum = 16;
          config.colNum = 30;
          config.mineNum = 99;
        }

        // 使用新的配置重置画布
        _msCanvas.rerun(config);

        // 重置笑脸
        const [img] = document.querySelectorAll(".face img");
        img.src = "../imgs/faces/normal.bmp";
      } catch (error) {
        _handleError(error);
      }
    },

    /**
     * 游戏说明
     */
    howToPlay: function () {
      const msgs = [
        "1. 左键点击来翻开格子，翻开有地雷的格子则游戏结束，翻开所有安全的格子则获得胜利。",
        "2. 每个数字表示该格子周围所有格子（上、下、左、右、左上、右上、左下、右下）中一共埋藏的地雷数。",
        "3. 当你确定某个未翻开的格子下方有地雷时，右键点击它，将会在其上方插上一把旗子作为标记。左键再次点击它时，不会将其翻开。",
      ];
      alert(msgs.join("\n"));
    },

    /**
     * 关于
     */
    about: function () {
      _openPage("https://github.com/itabbot/mine-sweeper");
    },
  };
})();

// 页面加载成功后执行
window.onload = async function () {
  MS.start();
};
