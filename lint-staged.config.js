export default {
  // 代码格式化
  // 格式化所有文件
  'src/**/*.{js,jsx,ts,tsx}': [
    'eslint --fix', // 👈 1. 先让 ESLint 自动修复语法和规范问题
    'prettier --write', // 👈 2. 再让 Prettier 统一代码风格
  ],
  'test/**/*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
};
