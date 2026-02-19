import React, { useState, useEffect } from 'react';
import { Search, Users, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  dateOfBirth: string;
  classroomName?: string;
}

interface ChildSelectorProps {
  onSelect: (childIds: string[]) => void;
  multiple?: boolean;
  classroomId?: string;
  selectedIds?: string[];
  maxSelection?: number;
}

export default function ChildSelector({
  onSelect,
  multiple = false,
  classroomId,
  selectedIds = [],
  maxSelection,
}: ChildSelectorProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [filteredChildren, setFilteredChildren] = useState<Child[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, [classroomId]);

  useEffect(() => {
    filterChildren();
  }, [searchTerm, children]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      // TODO: Chamar API real
      const mockChildren: Child[] = [
        {
          id: '1',
          firstName: 'Ana',
          lastName: 'Silva',
          dateOfBirth: '2024-03-15',
          classroomName: 'Berçário I',
        },
        {
          id: '2',
          firstName: 'João',
          lastName: 'Santos',
          dateOfBirth: '2024-05-20',
          classroomName: 'Berçário I',
        },
        {
          id: '3',
          firstName: 'Maria',
          lastName: 'Oliveira',
          dateOfBirth: '2024-01-10',
          classroomName: 'Berçário I',
        },
        {
          id: '4',
          firstName: 'Pedro',
          lastName: 'Costa',
          dateOfBirth: '2024-07-08',
          classroomName: 'Berçário I',
        },
        {
          id: '5',
          firstName: 'Julia',
          lastName: 'Ferreira',
          dateOfBirth: '2024-02-25',
          classroomName: 'Berçário I',
        },
        {
          id: '6',
          firstName: 'Lucas',
          lastName: 'Almeida',
          dateOfBirth: '2024-04-12',
          classroomName: 'Berçário I',
        },
      ];
      setChildren(mockChildren);
      setFilteredChildren(mockChildren);
    } catch (error) {
      console.error('Erro ao buscar crianças:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterChildren = () => {
    if (!searchTerm) {
      setFilteredChildren(children);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = children.filter(
      (child) =>
        child.firstName.toLowerCase().includes(term) ||
        child.lastName.toLowerCase().includes(term)
    );
    setFilteredChildren(filtered);
  };

  const toggleSelection = (childId: string) => {
    const newSelected = new Set(selected);

    if (newSelected.has(childId)) {
      newSelected.delete(childId);
    } else {
      if (!multiple) {
        newSelected.clear();
      }
      if (maxSelection && newSelected.size >= maxSelection) {
        return;
      }
      newSelected.add(childId);
    }

    setSelected(newSelected);
    onSelect(Array.from(newSelected));
  };

  const selectAll = () => {
    const allIds = filteredChildren.map((c) => c.id);
    setSelected(new Set(allIds));
    onSelect(allIds);
  };

  const clearSelection = () => {
    setSelected(new Set());
    onSelect([]);
  };

  const getInitials = (child: Child) => {
    return `${child.firstName[0]}${child.lastName[0]}`.toUpperCase();
  };

  const getAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    
    if (months < 12) {
      return `${months} meses`;
    }
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Carregando crianças...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca e ações */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        {multiple && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Selecionar Todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Info de seleção */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Users className="h-4 w-4" />
        <span>
          {selected.size} {selected.size === 1 ? 'criança selecionada' : 'crianças selecionadas'}
        </span>
        {maxSelection && (
          <Badge variant="outline" className="ml-2">
            Máximo: {maxSelection}
          </Badge>
        )}
      </div>

      {/* Grid de crianças */}
      {filteredChildren.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          Nenhuma criança encontrada
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredChildren.map((child) => {
            const isSelected = selected.has(child.id);
            return (
              <Card
                key={child.id}
                onClick={() => toggleSelection(child.id)}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 shadow-lg scale-105'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                }`}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  {/* Foto ou iniciais */}
                  <div className="relative">
                    {child.photoUrl ? (
                      <img
                        src={child.photoUrl}
                        alt={`${child.firstName} ${child.lastName}`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                          isSelected
                            ? 'bg-blue-700 text-white'
                            : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                        }`}
                      >
                        {getInitials(child)}
                      </div>
                    )}
                    {/* Checkbox visual */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 bg-white rounded-full p-1">
                        <Check className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                  </div>

                  {/* Nome */}
                  <div className="text-center">
                    <p className={`font-semibold ${isSelected ? 'text-white' : 'text-white'}`}>
                      {child.firstName}
                    </p>
                    <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                      {child.lastName}
                    </p>
                  </div>

                  {/* Idade */}
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      isSelected
                        ? 'bg-blue-700 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300'
                    }`}
                  >
                    {getAge(child.dateOfBirth)}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
