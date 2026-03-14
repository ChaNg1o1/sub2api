import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { mockListRequestDetails, showError, showWarning, copyToClipboard } = vi.hoisted(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
  })

  return {
    mockListRequestDetails: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    copyToClipboard: vi.fn(),
  }
})

vi.mock('@/api/admin/ops', () => ({
  opsAPI: {
    listRequestDetails: (...args: any[]) => mockListRequestDetails(...args),
  },
}))

vi.mock('@/stores', () => ({
  useAppStore: () => ({
    showError,
    showWarning,
  }),
}))

vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard,
  }),
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  const messages: Record<string, string> = {
    'common.refresh': 'Refresh',
    'common.loading': 'Loading',
    'common.yes': 'Yes',
    'common.no': 'No',
    'admin.ops.requestDetails.title': 'Request Details',
    'admin.ops.requestDetails.rangeMinutes': '60 minutes',
    'admin.ops.requestDetails.rangeHours': '1 hour',
    'admin.ops.requestDetails.rangeLabel': 'Window: 60 minutes',
    'admin.ops.requestDetails.failedToLoad': 'Failed to load request details',
    'admin.ops.requestDetails.kind.success': 'SUCCESS',
    'admin.ops.requestDetails.kind.error': 'ERROR',
    'admin.ops.requestDetails.table.time': 'Time',
    'admin.ops.requestDetails.table.kind': 'Kind',
    'admin.ops.requestDetails.table.platform': 'Platform',
    'admin.ops.requestDetails.table.model': 'Model',
    'admin.ops.requestDetails.table.duration': 'Duration',
    'admin.ops.requestDetails.table.wsTtft': 'WS TTFT',
    'admin.ops.requestDetails.table.status': 'Status',
    'admin.ops.requestDetails.table.requestId': 'Request ID',
    'admin.ops.requestDetails.table.actions': 'Actions',
    'admin.ops.requestDetails.timing.queueWait': 'Queue',
    'admin.ops.requestDetails.timing.connPick': 'Pick',
    'admin.ops.requestDetails.timing.connReused': 'Reused',
    'admin.ops.requestDetails.copy': 'Copy',
    'admin.ops.requestDetails.viewError': 'View Error',
  }

  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => messages[key] ?? key,
    }),
  }
})

import OpsRequestDetailsModal from '../OpsRequestDetailsModal.vue'

const BaseDialogStub = {
  props: ['show', 'title'],
  template: '<div v-if="show"><slot /></div>',
}

const PaginationStub = {
  template: '<div class="pagination-stub" />',
}

describe('OpsRequestDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    copyToClipboard.mockResolvedValue(true)
  })

  it('renders WS TTFT breakdown when present and hides it for non-WS rows', async () => {
    mockListRequestDetails.mockResolvedValue({
      items: [
        {
          kind: 'success',
          created_at: '2026-03-14T00:00:00Z',
          request_id: 'req-success',
          platform: 'openai',
          model: 'gpt-5',
          duration_ms: 321,
          openai_ws_queue_wait_ms: 41,
          openai_ws_conn_pick_ms: 6,
          openai_ws_conn_reused: true,
          stream: true,
        },
        {
          kind: 'error',
          created_at: '2026-03-14T00:01:00Z',
          request_id: 'req-error',
          platform: 'openai',
          model: 'gpt-5',
          duration_ms: 900,
          status_code: 500,
          error_id: 77,
          stream: true,
        },
      ],
      total: 2,
      page: 1,
      page_size: 10,
    })

    const wrapper = mount(OpsRequestDetailsModal, {
      props: {
        modelValue: false,
        timeRange: '1h',
        preset: {
          title: 'Request Details',
        },
        platform: 'openai',
        groupId: 7,
      },
      global: {
        stubs: {
          BaseDialog: BaseDialogStub,
          Pagination: PaginationStub,
        },
      },
    })

    await wrapper.setProps({ modelValue: true })
    await flushPromises()

    expect(mockListRequestDetails).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'all',
      sort: 'created_at_desc',
      platform: 'openai',
      group_id: 7,
      page: 1,
      page_size: 10,
    }))

    expect(wrapper.text()).toContain('WS TTFT')

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)

    const successTimingCell = rows[0].findAll('td')[5]
    expect(successTimingCell.text()).toContain('Queue')
    expect(successTimingCell.text()).toContain('41 ms')
    expect(successTimingCell.text()).toContain('Pick')
    expect(successTimingCell.text()).toContain('6 ms')
    expect(successTimingCell.text()).toContain('Reused')
    expect(successTimingCell.text()).toContain('Yes')

    const errorTimingCell = rows[1].findAll('td')[5]
    expect(errorTimingCell.text().trim()).toBe('-')
  })
})
