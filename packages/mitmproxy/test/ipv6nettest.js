const net = require('net');
const { setTimeout } = require('timers/promises');

// 测试的IPv6地址和端口
const TEST_HOST = '6.ipw.cn';
const TEST_PORT = 80;
const TIMEOUT = 5000; // 5秒超时

async function testIPv6Connection() {
  const socket = new net.Socket();
  
  // 设置超时
  socket.setTimeout(TIMEOUT);
  
  try {
    // 尝试连接
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        const { address, port } = socket.address();
        console.log(`成功连接到 ${TEST_HOST} 的IPv6地址 [${address}]:${port}`);
        socket.end();
        resolve();
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('连接超时'));
      });
      
      socket.on('error', (err) => {
        reject(err);
      });
      
      socket.connect(TEST_PORT, TEST_HOST);
    });
    
    return true;
  } catch (err) {
    console.error('IPv6连接测试失败:', err.message);
    return false;
  } finally {
    socket.destroy();
  }
}

// 执行测试
testIPv6Connection()
  .then(success => {
    console.log(`IPv6连接测试结果: ${success ? '成功' : '失败'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('测试过程中发生错误:', err);
    process.exit(1);
  });
