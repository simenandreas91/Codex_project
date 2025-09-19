export const snippetTypes = [
  {
    id: 'business_rule',
    label: 'Business Rule',
    description: 'Server-side logic triggered by database operations.',
    fields: [
      { id: 'application', label: 'Application', type: 'text', required: true, placeholder: 'Global' },
      { id: 'table', label: 'Table', type: 'text', required: true, placeholder: 'incident' },
      {
        id: 'when',
        label: 'When to run',
        type: 'select',
        required: true,
        options: ['before', 'after', 'async']
      },
      { id: 'order', label: 'Order', type: 'number', placeholder: '100' },
      { id: 'active', label: 'Active', type: 'checkbox', defaultValue: true },
      { id: 'filterCondition', label: 'Filter condition', type: 'textarea', placeholder: 'current.active == true' },
      { id: 'condition', label: 'Condition', type: 'textarea', placeholder: 'current.state == 6' }
    ]
  },
  {
    id: 'client_script',
    label: 'Client Script',
    description: 'Browser-executed logic reacting to UI interactions.',
    fields: [
      { id: 'application', label: 'Application', type: 'text', required: true, placeholder: 'Global' },
      { id: 'table', label: 'Table', type: 'text', required: true, placeholder: 'incident' },
      {
        id: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: ['onLoad', 'onChange', 'onSubmit', 'onCellEdit']
      },
      { id: 'field', label: 'Target field (if applicable)', type: 'text', placeholder: 'assignment_group' },
      { id: 'active', label: 'Active', type: 'checkbox', defaultValue: true }
    ]
  },
  {
    id: 'script_include',
    label: 'Script Include',
    description: 'Reusable server-side class or function library.',
    fields: [
      { id: 'application', label: 'Application', type: 'text', required: true, placeholder: 'Global' },
      {
        id: 'accessibleFrom',
        label: 'Accessible from',
        type: 'select',
        options: ['This application scope only', 'All application scopes'],
        required: true
      },
      { id: 'clientCallable', label: 'Client callable', type: 'checkbox', defaultValue: false }
    ]
  },
  {
    id: 'ui_policy',
    label: 'UI Policy',
    description: 'Rules that dynamically adjust form behavior.',
    fields: [
      { id: 'application', label: 'Application', type: 'text', required: true },
      { id: 'table', label: 'Table', type: 'text', required: true },
      { id: 'shortDescription', label: 'Short description', type: 'text', placeholder: 'Highlight P1 incidents' },
      { id: 'conditions', label: 'Conditions', type: 'textarea', placeholder: 'priority == 1' }
    ]
  },
  {
    id: 'ui_action',
    label: 'UI Action',
    description: 'Form or list buttons that trigger contextual automation.',
    fields: [
      { id: 'application', label: 'Application', type: 'text', required: true, placeholder: 'Global' },
      { id: 'table', label: 'Table', type: 'text', required: true, placeholder: 'incident' },
      { id: 'showInsert', label: 'Show insert', type: 'checkbox', defaultValue: true },
      { id: 'showUpdate', label: 'Show update', type: 'checkbox', defaultValue: true },
      { id: 'client', label: 'Client-side', type: 'checkbox', defaultValue: false },
      { id: 'condition', label: 'Condition', type: 'textarea', placeholder: 'current.active == true' }
    ]
  }
];
