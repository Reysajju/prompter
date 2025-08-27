interface Field {
  id: string;
  label: string;
  type: 'dropdown' | 'text' | 'textarea' | 'checkbox';
  options?: string[];
  required: boolean;
  default?: string;
  help?: string;
}

interface Props {
  fields: Field[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}

export default function FieldRenderer({ fields, values, onChange }: Props) {
  return (
    <div className="space-y-4">
      {fields.map(field => (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}{field.required && <span className="text-red-500">*</span>}
          </label>
          
          {field.type === 'dropdown' && (
            <select
              value={values[field.id] || field.default || ''}
              onChange={e => onChange(field.id, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose...</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}
          
          {field.type === 'text' && (
            <input
              type="text"
              value={values[field.id] || field.default || ''}
              onChange={e => onChange(field.id, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
          
          {field.type === 'textarea' && (
            <textarea
              value={values[field.id] || ''}
              onChange={e => onChange(field.id, e.target.value)}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
          
          {field.type === 'checkbox' && (
            <input
              type="checkbox"
              checked={values[field.id] === 'true'}
              onChange={e => onChange(field.id, e.target.checked.toString())}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          )}
          
          {field.help && (
            <p className="text-sm text-gray-500">{field.help}</p>
          )}
        </div>
      ))}
    </div>
  );
}