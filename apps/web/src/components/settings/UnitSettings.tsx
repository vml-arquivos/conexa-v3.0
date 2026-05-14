import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Building2, Save } from 'lucide-react';

interface UnitSettingsProps {
  unidade: any;
  setUnidade: (updater: (prev: any) => any) => void;
  canEdit: boolean;
  saving?: boolean;
  onSave?: () => void;
}

export function UnitSettings({
  unidade,
  setUnidade,
  canEdit,
  saving = false,
  onSave,
}: UnitSettingsProps) {
  if (!unidade?.id && !unidade?.name && !unidade?.unitCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <Building2 className="h-5 w-5" />
            Dados da Unidade
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-gray-500">Unidade não vinculada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <Building2 className="h-5 w-5" />
          Dados da Unidade
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Nome da Unidade</Label>
            <Input
              value={unidade.name || ''}
              readOnly={!canEdit}
              onChange={(e) =>
                setUnidade((u) => ({
                  ...u,
                  name: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label>Código da Unidade</Label>
            <Input value={unidade.unitCode || ''} readOnly />
          </div>

          <div>
            <Label>Telefone</Label>
            <Input
              value={unidade.telefone || ''}
              readOnly={!canEdit}
              onChange={(e) =>
                setUnidade((u) => ({
                  ...u,
                  telefone: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label>E-mail da Unidade</Label>
            <Input
              type="email"
              value={unidade.email || ''}
              readOnly={!canEdit}
              onChange={(e) =>
                setUnidade((u) => ({
                  ...u,
                  email: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div>
          <Label>Endereço</Label>
          <Textarea
            rows={2}
            value={unidade.endereco || ''}
            readOnly={!canEdit}
            onChange={(e) =>
              setUnidade((u) => ({
                ...u,
                endereco: e.target.value,
              }))
            }
          />
        </div>

        {canEdit && onSave && (
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Dados da Unidade
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
