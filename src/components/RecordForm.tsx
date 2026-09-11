// 記録を入力する画面。

import { useRef, useState } from 'react'
import {
  EXPRESSION_OPTIONS,
  MEAL_OPTIONS,
  OVERALL_OPTIONS,
  REHAB_OPTIONS,
  RESPONSE_OPTIONS,
  SLEEP_OPTIONS,
  TRISTATE_OPTIONS,
} from '../data/labels'
import { shrinkImage } from '../lib/image'
import { isEmptyRecord, newId } from '../lib/record'
import { store } from '../lib/storage'
import type { DailyRecord } from '../types'
import { PhotoImage } from './PhotoImage'
import { ChoiceGroup, CheckGroup, Field, Section } from './ui'

export function RecordForm({
  initialRecord,
  isNew,
  onSaved,
  onCancel,
}: {
  initialRecord: DailyRecord
  isNew: boolean
  onSaved: (record: DailyRecord) => void
  onCancel: () => void
}) {
  const [record, setRecord] = useState<DailyRecord>(initialRecord)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // この画面で追加した写真／外した写真をおぼえておき、
  // 保存か取り消しのタイミングで、いらない画像データを消す。
  const addedPhotoIds = useRef<string[]>([])
  const removedPhotoIds = useRef<string[]>([])

  function update(patch: Partial<DailyRecord>) {
    setRecord((prev) => ({ ...prev, ...patch }))
  }
  function updateVitals(patch: Partial<DailyRecord['vitals']>) {
    setRecord((prev) => ({ ...prev, vitals: { ...prev.vitals, ...patch } }))
  }
  function updateConsciousness(patch: Partial<DailyRecord['consciousness']>) {
    setRecord((prev) => ({ ...prev, consciousness: { ...prev.consciousness, ...patch } }))
  }
  function updateRehab(patch: Partial<DailyRecord['rehab']>) {
    setRecord((prev) => ({ ...prev, rehab: { ...prev.rehab, ...patch } }))
  }
  function updateStaffTalk(patch: Partial<DailyRecord['staffTalk']>) {
    setRecord((prev) => ({ ...prev, staffTalk: { ...prev.staffTalk, ...patch } }))
  }

  async function handleAddPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    setError('')
    try {
      for (const file of Array.from(files)) {
        const blob = await shrinkImage(file)
        const id = newId()
        await store.savePhoto(id, blob)
        addedPhotoIds.current.push(id)
        setRecord((prev) => ({
          ...prev,
          photos: [
            ...prev.photos,
            { id, name: file.name, type: blob.type || file.type, size: blob.size },
          ],
        }))
      }
    } catch {
      setError('写真を追加できませんでした。もう一度試してみてください。')
    } finally {
      setBusy(false)
    }
  }

  function handleRemovePhoto(photoId: string) {
    removedPhotoIds.current.push(photoId)
    setRecord((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== photoId) }))
  }

  async function handleSave() {
    if (!record.date) {
      setError('日付を入れてください。')
      return
    }
    if (isEmptyRecord(record)) {
      setError('まだ何も入力されていません。ひとつだけでも入力すると保存できます。')
      return
    }

    setBusy(true)
    setError('')
    try {
      const saved: DailyRecord = { ...record, updatedAt: new Date().toISOString() }
      await store.saveRecord(saved)
      // 外した写真の画像データを消す
      for (const id of removedPhotoIds.current) {
        if (!saved.photos.some((p) => p.id === id)) await store.deletePhoto(id)
      }
      removedPhotoIds.current = []
      addedPhotoIds.current = []
      onSaved(saved)
    } catch {
      setError('保存できませんでした。端末の空き容量を確認してみてください。')
      setBusy(false)
    }
  }

  async function handleCancel() {
    // 追加したけれど保存しなかった写真を片づける
    const keep = new Set(initialRecord.photos.map((p) => p.id))
    for (const id of addedPhotoIds.current) {
      if (!keep.has(id)) await store.deletePhoto(id)
    }
    onCancel()
  }

  return (
    <div className="form">
      <Section title="いつの記録か">
        <Field label="日付">
          <input
            type="date"
            value={record.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </Field>
        <div className="row">
          <Field label="面会 開始">
            <input
              type="time"
              value={record.visitFrom}
              onChange={(e) => update({ visitFrom: e.target.value })}
            />
          </Field>
          <Field label="面会 終了">
            <input
              type="time"
              value={record.visitTo}
              onChange={(e) => update({ visitTo: e.target.value })}
            />
          </Field>
        </div>
        <ChoiceGroup
          label="全体の調子"
          options={OVERALL_OPTIONS}
          value={record.overall}
          onChange={(value) => update({ overall: value })}
        />
      </Section>

      <Section title="体調・バイタル" description="わかるものだけでだいじょうぶです。">
        <div className="row">
          <Field label="体温（℃）">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="36.8"
              value={record.vitals.temperature}
              onChange={(e) => updateVitals({ temperature: e.target.value })}
            />
          </Field>
          <Field label="脈拍（回/分）">
            <input
              type="number"
              inputMode="numeric"
              placeholder="72"
              value={record.vitals.pulse}
              onChange={(e) => updateVitals({ pulse: e.target.value })}
            />
          </Field>
        </div>
        <div className="row">
          <Field label="血圧（上）">
            <input
              type="number"
              inputMode="numeric"
              placeholder="120"
              value={record.vitals.bpSystolic}
              onChange={(e) => updateVitals({ bpSystolic: e.target.value })}
            />
          </Field>
          <Field label="血圧（下）">
            <input
              type="number"
              inputMode="numeric"
              placeholder="80"
              value={record.vitals.bpDiastolic}
              onChange={(e) => updateVitals({ bpDiastolic: e.target.value })}
            />
          </Field>
        </div>
        <div className="row">
          <Field label="SpO2（%）">
            <input
              type="number"
              inputMode="numeric"
              placeholder="98"
              value={record.vitals.spo2}
              onChange={(e) => updateVitals({ spo2: e.target.value })}
            />
          </Field>
          <Field label="水分（ml）">
            <input
              type="number"
              inputMode="numeric"
              placeholder="500"
              value={record.vitals.hydration}
              onChange={(e) => updateVitals({ hydration: e.target.value })}
            />
          </Field>
        </div>
        <ChoiceGroup
          label="食事（主食）"
          options={MEAL_OPTIONS}
          value={record.vitals.mealMain}
          onChange={(value) => updateVitals({ mealMain: value ?? '' })}
        />
        <ChoiceGroup
          label="食事（副食）"
          options={MEAL_OPTIONS}
          value={record.vitals.mealSide}
          onChange={(value) => updateVitals({ mealSide: value ?? '' })}
        />
        <ChoiceGroup
          label="睡眠"
          options={SLEEP_OPTIONS}
          value={record.vitals.sleep}
          onChange={(value) => updateVitals({ sleep: value ?? '' })}
        />
        <Field label="排泄">
          <input
            type="text"
            placeholder="例）おむつ交換3回"
            value={record.vitals.excretion}
            onChange={(e) => updateVitals({ excretion: e.target.value })}
          />
        </Field>
        <Field label="体調のメモ">
          <textarea
            rows={3}
            placeholder="熱が下がった、咳が出ていた など"
            value={record.vitals.note}
            onChange={(e) => updateVitals({ note: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="意識・会話の様子" description="日によっての変化がいちばん見えるところです。">
        <ChoiceGroup
          label="受け答え"
          options={RESPONSE_OPTIONS}
          value={record.consciousness.response}
          onChange={(value) => updateConsciousness({ response: value ?? '' })}
        />
        <ChoiceGroup
          label="こちらを認識できたか"
          options={TRISTATE_OPTIONS}
          value={record.consciousness.recognizedMe}
          onChange={(value) => updateConsciousness({ recognizedMe: value ?? '' })}
        />
        <ChoiceGroup
          label="表情"
          options={EXPRESSION_OPTIONS}
          value={record.consciousness.expression}
          onChange={(value) => updateConsciousness({ expression: value ?? '' })}
        />
        <Field label="話した言葉" hint="ひと言でも、そのまま書き残しておくとあとで比べられます。">
          <textarea
            rows={3}
            placeholder="「ありがとう」と言えた など"
            value={record.consciousness.words}
            onChange={(e) => updateConsciousness({ words: e.target.value })}
          />
        </Field>
        <Field label="意識・会話のメモ">
          <textarea
            rows={3}
            value={record.consciousness.note}
            onChange={(e) => updateConsciousness({ note: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="リハビリ・できたこと">
        <CheckGroup
          label="受けたリハビリ"
          options={REHAB_OPTIONS}
          values={record.rehab.types}
          onChange={(types) => updateRehab({ types })}
        />
        <Field label="リハビリの内容">
          <textarea
            rows={3}
            placeholder="ベッドのそばで立つ練習を10分 など"
            value={record.rehab.content}
            onChange={(e) => updateRehab({ content: e.target.value })}
          />
        </Field>
        <Field label="できたこと" hint="小さなことでも書いておくと、あとで振り返るときの支えになります。">
          <textarea
            rows={3}
            placeholder="右手でスプーンを持てた など"
            value={record.rehab.achievements}
            onChange={(e) => updateRehab({ achievements: e.target.value })}
          />
        </Field>
        <Field label="リハビリのメモ">
          <textarea
            rows={2}
            value={record.rehab.note}
            onChange={(e) => updateRehab({ note: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="医師・看護師から聞いた話">
        <Field label="話した人">
          <input
            type="text"
            placeholder="〇〇先生 / 担当看護師さん"
            value={record.staffTalk.speaker}
            onChange={(e) => updateStaffTalk({ speaker: e.target.value })}
          />
        </Field>
        <Field label="聞いた内容">
          <textarea
            rows={4}
            placeholder="検査の結果、今後の方針など"
            value={record.staffTalk.content}
            onChange={(e) => updateStaffTalk({ content: e.target.value })}
          />
        </Field>
        <Field label="薬の変更">
          <textarea
            rows={2}
            value={record.staffTalk.medicationChange}
            onChange={(e) => updateStaffTalk({ medicationChange: e.target.value })}
          />
        </Field>
        <Field label="次回の予定・面談">
          <input
            type="text"
            placeholder="来週の水曜にカンファレンス など"
            value={record.staffTalk.nextMeeting}
            onChange={(e) => updateStaffTalk({ nextMeeting: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="写真" description="端末の中だけに保存されます。">
        <div className="photo-grid">
          {record.photos.map((photo) => (
            <div className="photo-item" key={photo.id}>
              <PhotoImage photoId={photo.id} alt={photo.name} />
              <button
                type="button"
                className="photo-remove"
                onClick={() => handleRemovePhoto(photo.id)}
                aria-label="この写真を外す"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <label className="file-button">
          写真を追加
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              void handleAddPhotos(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </Section>

      <Section title="そのほか">
        <Field label="自由メモ">
          <textarea
            rows={4}
            placeholder="気づいたこと、次に持っていくもの、自分の気持ちなど"
            value={record.freeNote}
            onChange={(e) => update({ freeNote: e.target.value })}
          />
        </Field>
      </Section>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => void handleCancel()}>
          やめる
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void handleSave()}
        >
          {busy ? '保存中…' : isNew ? 'この内容で保存' : '変更を保存'}
        </button>
      </div>
    </div>
  )
}
