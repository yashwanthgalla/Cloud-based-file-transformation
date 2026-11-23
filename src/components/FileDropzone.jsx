import { useCallback, useId, useRef, useState } from 'react'

export default function FileDropzone({
  accept,
  multiple = false,
  disabled = false,
  title = 'Drop files here',
  hint = 'or click to choose',
  onFiles,
}) {
  const inputRef = useRef(null)
  const id = useId()
  const [isDragActive, setIsDragActive] = useState(false)

  const pick = useCallback(() => {
    if (disabled) return
    inputRef.current?.click()
  }, [disabled])

  const handleFiles = useCallback(
    (fileList) => {
      if (disabled) return
      const files = Array.from(fileList ?? [])
      if (files.length === 0) return
      onFiles?.(files)
    },
    [disabled, onFiles],
  )

  const onChange = useCallback(
    (e) => {
      handleFiles(e.target.files)
      e.target.value = ''
    },
    [handleFiles],
  )

  const onDragOver = useCallback(
    (e) => {
      e.preventDefault()
      if (disabled) return
      setIsDragActive(true)
    },
    [disabled],
  )

  const onDragLeave = useCallback(() => {
    setIsDragActive(false)
  }, [])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      if (disabled) return
      setIsDragActive(false)
      handleFiles(e.dataTransfer?.files)
    },
    [disabled, handleFiles],
  )

  const onKeyDown = useCallback(
    (e) => {
      if (disabled) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        pick()
      }
    },
    [disabled, pick],
  )

  return (
    <div
      className={`dropzone${isDragActive ? ' dropzoneActive' : ''}${disabled ? ' dropzoneDisabled' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-describedby={`${id}-hint`}
      onClick={pick}
      onKeyDown={onKeyDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        style={{ display: 'none' }}
      />
      <div className="dropzoneInner">
        <div className="dropzoneTitle">{title}</div>
        <div className="dropzoneHint" id={`${id}-hint`}>
          {hint}
        </div>
      </div>
    </div>
  )
}
