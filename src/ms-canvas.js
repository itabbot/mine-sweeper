/**
 * 游戏画布类
 * @param {string} id 画布ID
 * @param {object} configs 配置项
 */
function MSCanvas(id, configs = {}) {
  let _id = ""; // 画布ID
  let _element = null; // 画布元素
  let _context = null; // 画布上下文
  let _isPlaying = false; // 游戏是否正在进行中
  let _timer = null; // 计时器

  // 配置项
  const _configs = {
    gridSize: 25, // 每个格子的边长（像素）
    rowNum: 15, // 行数（纵向格子数量）
    colNum: 20, // 列数（横向格子数量）
    mineNum: 20, // 布置的地雷数

    gameOver: null, // 游戏失败回调函数
    gameWin: null, // 游戏获胜回调函数
    resize: null, // 画布大小改变回调函数
    flagNumChange: null, // 旗子数变化回调函数
    heartbeat: null, // 游戏心跳回调函数

    // 图像资源
    images: {
      number0: null, // 空白且打开状态
      number1: null, // 数字1
      number2: null, // 数字2
      number3: null, // 数字3
      number4: null, // 数字4
      number5: null, // 数字5
      number6: null, // 数字6
      number7: null, // 数字7
      number8: null, // 数字8
      mine: null, // 地雷
      burst: null, // 爆炸的地雷
      flag: null, // 标记的旗子
      closed: null, // 关闭的格子
      hover: null, // 悬停在格子上
    },
  };

  // 画布数据
  const _datas = {
    grids: [], // 所有格子
    duration: 0, // 游戏持续时长（秒）
  };

  /**
   * 通过事件对象获取触发事件的格子
   * @param {object} event
   * @returns {object} 触发事件的格子，没有相关格子时返回 null
   */
  const _getGridByEvent = function (event) {
    const rect = document.getElementById(_id).getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const rowIdx = Math.ceil(y / _configs.gridSize) - 1;
    const colIdx = Math.ceil(x / _configs.gridSize) - 1;

    if (_datas.grids[rowIdx] && _datas.grids[rowIdx][colIdx]) {
      return _datas.grids[rowIdx][colIdx];
    }
    return null;
  };

  /**
   * 处理画布鼠标移动事件
   * @param {object} event
   */
  const _handleMousemove = function (event) {
    if (_isPlaying) {
      // 获取触发事件的格子
      const grid = _getGridByEvent(event);
      if (!grid) return;

      // 设置所有格子为非鼠标悬浮状态
      for (let rowIdx = 0; rowIdx < _configs.rowNum; rowIdx++) {
        for (let colIdx = 0; colIdx < _configs.colNum; colIdx++) {
          _datas.grids[rowIdx][colIdx].isHover = false;
        }
      }

      // 设置当前格子为鼠标悬浮状态
      grid.isHover = true;
    }
  };

  /**
   * 停止游戏循环
   */
  const _stopGameLoop = async function () {
    // 延迟几帧让画面绘制完毕
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve(true);
        });
      });
    });

    // 清除计时器
    if (_timer) clearInterval(_timer);

    // 更新游戏状态
    _isPlaying = false;
  };

  /**
   * 游戏结束
   */
  const _gameOver = async function () {
    // 打开所有雷
    for (let rowIdx = 0; rowIdx < _configs.rowNum; rowIdx++) {
      for (let colIdx = 0; colIdx < _configs.colNum; colIdx++) {
        const grid = _datas.grids[rowIdx][colIdx];
        if (grid.isMine) grid.isOpened = true;
      }
    }

    // 停止游戏循环
    await _stopGameLoop();

    // 触发游戏结束事件
    if (_configs.gameOver) _configs.gameOver();
  };

  /**
   * 睡眠指定毫秒数
   * @param {integer} timeout 毫秒数
   */
  const _sleep = async function (timeout) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  };

  /**
   * 递归打开指定空格子周围的八个格子
   *
   * 空格子：没有地雷也不是数字
   * 递归：如果这八个格子中还有空格子，则继续打开其周围八个格子，以此类推
   *
   * @param {object} grid 指定的空格子
   */
  const _recursiveOpenEmptyGrid = async function (grid) {
    if (grid.isMine || grid.isNumber) return;

    // 可以继续打开的格子
    // 先收集起来，然后再一起打开
    // 为了实现连锁式的动画效果
    const targetGrids = [];

    // 遍历格子所在九宫格
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        // 计算的当前宫格坐标
        const rIdx = grid.rowIdx - 1 + r;
        const cIdx = grid.colIdx - 1 + c;

        // 跳过边界
        if (
          rIdx < 0 || // 超过上方边边界
          cIdx < 0 || // 超过左侧边界
          rIdx >= _configs.rowNum || // 超过下方边边界
          cIdx >= _configs.colNum // 超过右侧边界
        ) {
          continue;
        }

        // 跳过当前格子
        if (rIdx === grid.rowIdx && cIdx === grid.colIdx) {
          continue;
        }

        // 打开目标格子
        const targetGrid = _datas.grids[rIdx][cIdx];
        if (!targetGrid.isOpened) {
          targetGrid.isOpened = true;
          // 收集可以继续打开的格子
          if (!grid.isMine && !grid.isNumber) {
            targetGrids.push(targetGrid);
          }
        }
      }
    }

    // 睡眠一小会
    await _sleep(50);

    // 打开所有目标格子
    // 注意这里是异步执行
    for (let i = 0; i < targetGrids.length; i++) {
      _recursiveOpenEmptyGrid(targetGrids[i]);
    }
  };

  /**
   * 游戏胜利
   */
  const _gameWin = async function () {
    // 停止游戏循环
    await _stopGameLoop();

    // 触发游戏胜利事件
    if (_configs.gameWin) _configs.gameWin();
  };

  /**
   * 旗子数量变化
   */
  const _flagNumChange = function () {
    // 计算旗子数量
    let flagNum = 0;
    for (let rowIdx = 0; rowIdx < _configs.rowNum; rowIdx++) {
      for (let colIdx = 0; colIdx < _configs.colNum; colIdx++) {
        const g = _datas.grids[rowIdx][colIdx];
        if (!g.isOpened && g.isFlag) flagNum += 1;
      }
    }

    // 触发旗子数量变化事件
    if (_configs.flagNumChange) {
      _configs.flagNumChange(flagNum, _configs.mineNum);
    }
  };

  /**
   * 处理画布鼠标按下事件
   * @param {object} event
   */
  const _handleMousedown = async function (event) {
    if (_isPlaying) {
      // 获取触发事件的格子
      const grid = _getGridByEvent(event);
      if (!grid) return;

      // 左键点击
      if (event.button === 0) {
        // 非旗子、非打开时
        // 打开格子
        if (!grid.isFlag && !grid.isOpened) {
          grid.isOpened = true;

          // 是地雷，则游戏结束
          if (grid.isMine) {
            grid.isBurst = true;
            await _gameOver();
            return;
          }

          // 是空格子，则递归打开其周围的八个格子
          if (!grid.isMine && !grid.isNumber) {
            await _recursiveOpenEmptyGrid(grid);
          }

          // 所有没打开的格子都是雷，则胜利
          let isWin = true;
          for (let rowIdx = 0; rowIdx < _configs.rowNum; rowIdx++) {
            for (let colIdx = 0; colIdx < _configs.colNum; colIdx++) {
              const g = _datas.grids[rowIdx][colIdx];
              if (!g.isOpened && !g.isMine) isWin = false;
            }
          }
          if (isWin) _gameWin();
        }
      }

      // 右键点击
      if (event.button === 2) {
        // 已经打开则不处理
        if (grid.isOpened) return;

        // 如果是旗子，则改为正常
        if (grid.isFlag) {
          grid.isFlag = false;
          _flagNumChange();
          return;
        }

        // 如果是正常，则插旗子
        if (!grid.isFlag) {
          grid.isFlag = true;
          _flagNumChange();
          return;
        }
      }
    }
  };

  /**
   * 处理画布鼠标移出事件
   * @param {object} event
   */
  const _handleMouseout = function () {
    if (_isPlaying) {
      // 设置所有格子为非鼠标悬浮状态
      for (let rowIdx = 0; rowIdx < _configs.rowNum; rowIdx++) {
        for (let colIdx = 0; colIdx < _configs.colNum; colIdx++) {
          _datas.grids[rowIdx][colIdx].isHover = false;
        }
      }
    }
  };

  /**
   * 初始化画布
   * @param {string} id 画布标签ID
   */
  const _init = function (id) {
    // 画布ID
    _id = id;
    if (typeof _id !== "string" || !_id) throw new Error("画布ID有误");

    // 获取画布元素
    _element = document.getElementById(_id);
    if (!_element) throw new Error("画布不存在");

    // 取画布上下文
    _context = _element.getContext("2d");
    if (!_context) throw new Error("获取画布上下文失败");

    // 阻止画布右键菜单
    _element.oncontextmenu = function (event) {
      event.preventDefault();
    };

    // 绑定事件
    _element.onmousemove = _handleMousemove;
    _element.onmousedown = _handleMousedown;
    _element.onmouseout = _handleMouseout;
  };

  /**
   * 配置画布
   * 仅设置传入的配置项
   * @param {object} cfgs 配置项
   */
  const _setConfigs = function (cfgs = {}) {
    const { gridSize, rowNum, colNum, mineNum, images, resize, gameOver, gameWin, flagNumChange, heartbeat } = cfgs;

    // 每个格子的边长（像素）
    if (gridSize) _configs.gridSize = gridSize;

    // 行数（纵向格子数量）
    if (rowNum) _configs.rowNum = rowNum;

    // 列数（横向格子数量）
    if (colNum) _configs.colNum = colNum;

    // 地雷数
    if (mineNum) _configs.mineNum = mineNum;

    // 图像资源
    if (images) _configs.images = images;

    // 画布大小改变回调函数
    if (resize) _configs.resize = resize;

    // 游戏结束回调函数
    if (gameOver) _configs.gameOver = gameOver;

    // 游戏获胜回调函数
    if (gameWin) _configs.gameWin = gameWin;

    // 旗子数变化回调函数
    if (flagNumChange) _configs.flagNumChange = flagNumChange;

    // 游戏心跳回调函数
    if (heartbeat) _configs.heartbeat = heartbeat;
  };

  /**
   * 检查画布配置
   */
  const _checkConfigs = function () {
    const { gridSize, rowNum, colNum, mineNum, images, resize, gameOver, gameWin, flagNumChange, heartbeat } = _configs;

    // 图像资源键名
    const imageKeys = [
      "number0",
      "number1",
      "number2",
      "number3",
      "number4",
      "number5",
      "number6",
      "number7",
      "number8",
      "mine",
      "burst",
      "flag",
      "closed",
      "hover",
    ];

    if (typeof gridSize !== "number" || gridSize <= 0) {
      throw new Error("格子边长有误");
    }

    if (typeof rowNum !== "number" || rowNum <= 0) {
      throw new Error("行数有误");
    }

    if (typeof colNum !== "number" || colNum <= 0) {
      throw new Error("列数有误");
    }

    if (typeof mineNum !== "number" || mineNum <= 0) {
      throw new Error("地雷数有误");
    }

    if (typeof images !== "object") throw new Error("图像资源有误");
    imageKeys.forEach((imgKey) => {
      if (!images[imgKey]) {
        throw new Error(`缺少图像资源${imgKey}`);
      }
    });

    if (resize && typeof resize !== "function") {
      throw new Error("画布大小改变回调函数有误");
    }

    if (gameOver && typeof gameOver !== "function") {
      throw new Error("游戏结束回调函数有误");
    }

    if (gameWin && typeof gameWin !== "function") {
      throw new Error("游戏获胜回调函数有误");
    }

    if (flagNumChange && typeof flagNumChange !== "function") {
      throw new Error("旗子数变化回调函数有误");
    }

    if (heartbeat && typeof heartbeat !== "function") {
      throw new Error("游戏心跳回调函数有误");
    }
  };

  /**
   * 刷新画布宽高
   */
  const _refreshSize = function () {
    const { colNum, rowNum, gridSize, resize } = _configs;

    _element.width = gridSize * colNum;
    _element.height = gridSize * rowNum;

    if (resize) resize(_element.width, _element.height);
  };

  /**
   * 重置格子
   */
  const _resetGrids = function () {
    _datas.grids = [];
    for (let rowIdx = 0; rowIdx < _configs.rowNum; rowIdx++) {
      _datas.grids[rowIdx] = [];
      for (let colIdx = 0; colIdx < _configs.colNum; colIdx++) {
        _datas.grids[rowIdx][colIdx] = {
          rowIdx, // 行索引（从1开始）
          colIdx, // 列索引（从1开始）
          number: 0, // 数字（周围九宫格地雷的数量）
          isOpened: false, // 是否已经打开
          isMine: false, // 是否地雷
          isNumber: false, // 是否数字
          isBurst: false, // 是否爆炸
          isFlag: false, // 是否旗子
          isHover: false, // 是否鼠标悬浮着
        };
      }
    }
  };

  /**
   * 生成指定范围的随机数
   * @param {integer} min 最小值（包含）
   * @param {integer} max 最大值（包含）
   * @returns {integer}
   */
  const _random = function (min, max) {
    return parseInt(Math.random() * (max - min + 1) + min, 10);
  };

  /**
   * 随机布置地雷
   */
  const _setMine = function () {
    // 生成所有格子的坐标
    const coords = [];
    for (let rowIdx = 0; rowIdx < _configs.rowNum; rowIdx++) {
      for (let colIdx = 0; colIdx < _configs.colNum; colIdx++) {
        coords.push({ rowIdx, colIdx });
      }
    }

    // 随机获取坐标设置为地雷
    for (let i = 0; i < _configs.mineNum; i++) {
      const randomIdx = _random(0, coords.length - 1);
      const { rowIdx, colIdx } = coords.splice(randomIdx, 1)[0];
      _datas.grids[rowIdx][colIdx].isMine = true;
    }
  };

  /**
   * 标记地雷数
   */
  const _setMineNumber = function () {
    // 遍历所有格子
    for (let rowIdx = 0; rowIdx < _configs.rowNum; rowIdx++) {
      for (let colIdx = 0; colIdx < _configs.colNum; colIdx++) {
        // 跳过地雷
        if (_datas.grids[rowIdx][colIdx].isMine) continue;

        // 遍历格子所在九宫格，累计地雷数
        let number = 0;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            // 计算的当前宫格坐标
            const rIdx = rowIdx - 1 + r;
            const cIdx = colIdx - 1 + c;

            // 跳过边界
            if (
              rIdx < 0 || // 超过上方边边界
              cIdx < 0 || // 超过左侧边界
              rIdx >= _configs.rowNum || // 超过下方边边界
              cIdx >= _configs.colNum // 超过右侧边界
            ) {
              continue;
            }

            // 累计地雷数
            if (_datas.grids[rIdx][cIdx].isMine) {
              number += 1;
            }
          }
        }

        // 设置格子
        if (number > 0) {
          _datas.grids[rowIdx][colIdx].number = number;
          _datas.grids[rowIdx][colIdx].isNumber = true;
        }
      }
    }
  };

  /**
   * 持续时间变化
   * @param {integer} duration
   */
  const _durationChange = function (duration = undefined) {
    if (duration !== undefined) {
      // 设置为目标值
      _datas.duration = duration;
    } else {
      // 累计游戏时长
      _datas.duration += 1;
    }

    // 触发游戏心跳事件
    if (_configs.heartbeat) _configs.heartbeat(_datas.duration);
  };

  /**
   * 重置画布数据
   */
  const _resetData = function () {
    // 重置格子
    _resetGrids();

    // 旗子数变化
    _flagNumChange();

    // 随机布置地雷
    _setMine();

    // 标记地雷数
    _setMineNumber();

    // 重设游戏时长
    _durationChange(0);
  };

  /**
   * 重新绘制画布
   */
  const _repaint = () => {
    // 获取配置
    const { gridSize, images } = _configs;

    // 遍历所有格子
    for (let rowIdx = 0; rowIdx < _datas.grids.length; rowIdx++) {
      const row = _datas.grids[rowIdx];
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const { number, isOpened, isMine, isNumber, isBurst, isFlagError, isFlag, isQuestionMark, isHover } =
          row[colIdx];

        // 计算绘制的像素坐标
        const X = colIdx * gridSize;
        const Y = rowIdx * gridSize;

        // 判定绘制的图像
        let image = null;
        if (isOpened) {
          if (isBurst) {
            image = images.burst;
          } else if (isMine) {
            image = images.mine;
          } else if (isNumber) {
            image = images[`number${number}`];
          } else {
            image = images.number0;
          }
        } else {
          if (isFlag) {
            image = images.flag;
          } else if (isHover) {
            image = images.hover;
          } else {
            image = images.closed;
          }
        }

        // 绘制图像
        _context.drawImage(image, X, Y, gridSize, gridSize);
      }
    }
  };

  /**
   * 游戏循环
   */
  const _gameLoop = () => {
    if (!_isPlaying) return;

    // 重新绘制界面
    _repaint();

    // 设置下一帧继续处理
    requestAnimationFrame(_gameLoop);
  };

  /**
   * 启动游戏循环
   */
  const _startGameLoop = () => {
    // 更新游戏状态
    _isPlaying = true;

    // 启动计时器
    _timer = setInterval(() => {
      _durationChange();
    }, 1000);

    // 执行游戏循环
    _gameLoop();
  };

  /**
   * 启动画布
   * @param {object} cfgs 配置项
   */
  const _run = async function (cfgs = {}) {
    // 配置画布
    _setConfigs(cfgs);

    // 检查画布配置
    _checkConfigs();

    // 刷新画布宽高
    _refreshSize();

    // 重置画布数据
    _resetData();

    // 启动游戏循环
    _startGameLoop();
  };

  ////////// 实例化逻辑 //////////

  // 初始化画布
  _init(id);
  // 启动画布
  _run(configs);

  ////////// 以下是共有方法 //////////

  /**
   * 重置画布
   * @param {object} cfgs 配置项
   */
  this.rerun = async function (cfgs = {}) {
    // 停止游戏循环
    await _stopGameLoop();

    // 启动画布
    _run(cfgs);
  };
}
