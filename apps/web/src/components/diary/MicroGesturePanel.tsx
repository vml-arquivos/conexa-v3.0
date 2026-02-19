import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MicroGesture {
  type: 'SONO' | 'ALIMENTACAO' | 'FRALDA' | 'HUMOR' | 'INCIDENTE' | 'HIGIENE';
  icon: string;
  label: string;
  color: string;
  quickActions?: QuickAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon?: string;
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

interface MicroGesturePanelProps {
  child: Child;
  onRegister: (gesture: { type: string; action?: string; timestamp: Date }) => Promise<void>;
}

const MICRO_GESTURES: MicroGesture[] = [
  {
    type: 'SONO',
    icon: '😴',
    label: 'Sono',
    color: 'purple',
    quickActions: [
      { id: 'dormiu', label: 'Dormiu', icon: '💤' },
      { id: 'acordou', label: 'Acordou', icon: '👀' },
      { id: 'soneca', label: 'Soneca', icon: '😴' },
    ],
  },
  {
    type: 'ALIMENTACAO',
    icon: '🍼',
    label: 'Alimentação',
    color: 'green',
    quickActions: [
      { id: 'mamou', label: 'Mamou', icon: '🍼' },
      { id: 'comeu_bem', label: 'Comeu Bem', icon: '😋' },
      { id: 'recusou', label: 'Recusou', icon: '😐' },
      { id: 'lanche', label: 'Lanche', icon: '🍪' },
    ],
  },
  {
    type: 'FRALDA',
    icon: '🧷',
    label: 'Fralda',
    color: 'blue',
    quickActions: [
      { id: 'trocou', label: 'Trocou', icon: '✅' },
      { id: 'xixi', label: 'Xixi', icon: '💧' },
      { id: 'coco', label: 'Cocô', icon: '💩' },
    ],
  },
  {
    type: 'HUMOR',
    icon: '😊',
    label: 'Humor',
    color: 'yellow',
    quickActions: [
      { id: 'feliz', label: 'Feliz', icon: '😊' },
      { id: 'choroso', label: 'Choroso', icon: '😢' },
      { id: 'irritado', label: 'Irritado', icon: '😠' },
      { id: 'tranquilo', label: 'Tranquilo', icon: '😌' },
    ],
  },
  {
    type: 'HIGIENE',
    icon: '🧼',
    label: 'Higiene',
    color: 'cyan',
    quickActions: [
      { id: 'banho', label: 'Banho', icon: '🛁' },
      { id: 'escovou_dentes', label: 'Escovou Dentes', icon: '🦷' },
      { id: 'lavou_maos', label: 'Lavou Mãos', icon: '🧼' },
    ],
  },
  {
    type: 'INCIDENTE',
    icon: '⚠️',
    label: 'Incidente',
    color: 'red',
    quickActions: [
      { id: 'pequeno', label: 'Pequeno', icon: '🩹' },
      { id: 'medio', label: 'Médio', icon: '⚠️' },
      { id: 'grave', label: 'Grave', icon: '🚨' },
    ],
  },
];

export default function MicroGesturePanel({ child, onRegister }: MicroGesturePanelProps) {
  const [selectedGesture, setSelectedGesture] = useState<string | null>(null);
  const [lastRegisters, setLastRegisters] = useState<Array<{ type: string; time: string; action: string }>>([
    { type: 'ALIMENTACAO', time: '10:30', action: 'Mamou' },
    { type: 'FRALDA', time: '09:15', action: 'Trocou' },
    { type: 'SONO', time: '08:00', action: 'Acordou' },
  ]);
  const [registering, setRegistering] = useState(false);

  const handleQuickRegister = async (gestureType: string, actionId?: string) => {
    try {
      setRegistering(true);
      const timestamp = new Date();
      
      await onRegister({
        type: gestureType,
        action: actionId,
        timestamp,
      });

      // Atualizar histórico local
      const gesture = MICRO_GESTURES.find((g) => g.type === gestureType);
      const action = gesture?.quickActions?.find((a) => a.id === actionId);
      
      setLastRegisters([
        {
          type: gestureType,
          time: timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          action: action?.label || gesture?.label || 'Registrado',
        },
        ...lastRegisters.slice(0, 4),
      ]);

      toast.success('Registrado com sucesso!', {
        description: `${gesture?.icon} ${action?.label || gesture?.label}`,
        duration: 2000,
      });

      setSelectedGesture(null);
    } catch (error) {
      toast.error('Erro ao registrar', {
        description: 'Tente novamente',
      });
    } finally {
      setRegistering(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'bg-purple-600 hover:bg-purple-700 border-purple-500',
      green: 'bg-green-600 hover:bg-green-700 border-green-500',
      blue: 'bg-blue-600 hover:bg-blue-700 border-blue-500',
      yellow: 'bg-yellow-600 hover:bg-yellow-700 border-yellow-500',
      cyan: 'bg-cyan-600 hover:bg-cyan-700 border-cyan-500',
      red: 'bg-red-600 hover:bg-red-700 border-red-500',
    };
    return colors[color] || 'bg-gray-600 hover:bg-gray-700 border-gray-500';
  };

  const getGestureIcon = (type: string) => {
    return MICRO_GESTURES.find((g) => g.type === type)?.icon || '📝';
  };

  return (
    <div className="space-y-6">
      {/* Header com info da criança */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white">
              {child.firstName[0]}{child.lastName[0]}
            </div>
            <div>
              <CardTitle className="text-white text-xl">
                {child.firstName} {child.lastName}
              </CardTitle>
              <p className="text-gray-400 text-sm mt-1">Registro Rápido - Micro-Gestos</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Botões de micro-gestos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {MICRO_GESTURES.map((gesture) => (
          <Button
            key={gesture.type}
            onClick={() => setSelectedGesture(gesture.type)}
            disabled={registering}
            className={`h-24 flex flex-col items-center justify-center gap-2 text-white border-2 transition-all ${getColorClasses(
              gesture.color
            )} ${selectedGesture === gesture.type ? 'scale-105 shadow-lg' : ''}`}
          >
            <span className="text-4xl">{gesture.icon}</span>
            <span className="font-semibold">{gesture.label}</span>
          </Button>
        ))}
      </div>

      {/* Ações rápidas do gesto selecionado */}
      {selectedGesture && (
        <Card className="bg-gray-900/50 border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {MICRO_GESTURES.find((g) => g.type === selectedGesture)?.icon}
              {MICRO_GESTURES.find((g) => g.type === selectedGesture)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MICRO_GESTURES.find((g) => g.type === selectedGesture)?.quickActions?.map((action) => (
                <Button
                  key={action.id}
                  onClick={() => handleQuickRegister(selectedGesture, action.id)}
                  disabled={registering}
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                >
                  {action.icon && <span className="text-2xl">{action.icon}</span>}
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedGesture(null)}
              className="mt-4 w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Últimos registros */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Últimos Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastRegisters.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Nenhum registro ainda</p>
          ) : (
            <div className="space-y-2">
              {lastRegisters.map((register, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getGestureIcon(register.type)}</span>
                    <div>
                      <p className="text-white font-medium">{register.action}</p>
                      <p className="text-gray-400 text-sm">{register.time}</p>
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-green-500" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indicador de registro */}
      {registering && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Registrando...</span>
        </div>
      )}
    </div>
  );
}
