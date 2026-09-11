import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // どこに置いても動くように、ファイルの場所を相対パスにする
  // （GitHub Pages のようにサブフォルダで公開する場合も、そのまま動く）
  base: './',
  plugins: [react()],
})
