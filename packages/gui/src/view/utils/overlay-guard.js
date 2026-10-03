/**
 * 防止 antd Modal/Drawer 遮罩残留导致整页点不动。
 * - Esc：销毁全部 Modal
 * - 看门狗：只有 mask 没有打开中的浮层时，移除孤儿 mask
 */
import { Modal } from 'ant-design-vue'

function hasOpenOverlay () {
  return !!document.querySelector(
    '.ant-modal-wrap.ant-modal-open, .ant-drawer-open, .ant-modal-confirm',
  )
}

function removeOrphanMasks () {
  if (hasOpenOverlay()) {
    return
  }
  const masks = document.querySelectorAll('.ant-modal-mask, .ant-drawer-mask')
  for (const el of masks) {
    if (el.parentNode) {
      el.parentNode.removeChild(el)
    }
  }
}

function destroyAllOverlays () {
  try {
    Modal.destroyAll()
  } catch {
    // ignore
  }
  try {
    removeOrphanMasks()
  } catch {
    // ignore
  }
}

export function installOverlayGuard () {
  const onKey = (e) => {
    if (e.key === 'Escape') {
      destroyAllOverlays()
    }
  }
  document.addEventListener('keydown', onKey)
  const timer = setInterval(removeOrphanMasks, 2000)
  return () => {
    document.removeEventListener('keydown', onKey)
    clearInterval(timer)
  }
}
