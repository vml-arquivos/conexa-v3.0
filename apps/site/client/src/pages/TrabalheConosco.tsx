import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, Heart, Users, BookOpen, Award } from 'lucide-react';
import SEO from '@/components/SEO';

export default function TrabalheConosco() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    position: '',
    unitId: undefined as number | undefined,
    education: '',
    experience: '',
    skills: '',
    availability: '',
    coverLetter: '',
  });

  const { data: units } = trpc.units.getAll.useQuery();
  const submitApplication = trpc.jobs.submit.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitApplication.mutateAsync(formData);
      setSubmitSuccess(true);
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        cpf: '',
        birthDate: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        position: '',
        unitId: undefined,
        education: '',
        experience: '',
        skills: '',
        availability: '',
        coverLetter: '',
      });
    } catch (error: any) {
      alert(error.message || 'Erro ao enviar candidatura. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Máscaras
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const maskDate = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{4})\d+?$/, '$1');
  };

  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-16">
        <SEO
          title="Candidatura Enviada - Trabalhe Conosco"
          description="Sua candidatura foi enviada com sucesso! Entraremos em contato em breve."
        />
        <div className="container max-w-2xl">
          <Card className="text-center">
            <CardContent className="pt-12 pb-12">
              <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Candidatura Enviada!</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Recebemos sua candidatura com sucesso. Nossa equipe de Recursos Humanos irá
                analisar seu perfil e entraremos em contato em breve.
              </p>
              <Button onClick={() => setSubmitSuccess(false)} size="lg">
                Enviar Outra Candidatura
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <SEO
        title="Trabalhe Conosco - Faça Parte da Nossa Equipe"
        description="Venha fazer parte da equipe COCRIS e transformar vidas através da educação infantil. Confira nossas oportunidades de trabalho."
      />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Trabalhe Conosco
            </h1>
            <p className="text-xl opacity-90">
              Faça parte de uma equipe dedicada a transformar vidas através da educação e do amor.
              Junte-se a nós na missão de cuidar e educar nossas crianças.
            </p>
          </div>
        </div>
      </div>

      {/* Valores Section */}
      <div className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Nossos Valores</h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Amor e Compaixão</h3>
                <p className="text-sm text-muted-foreground">
                  Cuidamos de cada criança com carinho e dedicação
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Trabalho em Equipe</h3>
                <p className="text-sm text-muted-foreground">
                  Valorizamos a colaboração e o respeito mútuo
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Educação de Qualidade</h3>
                <p className="text-sm text-muted-foreground">
                  Comprometidos com a excelência pedagógica
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Desenvolvimento</h3>
                <p className="text-sm text-muted-foreground">
                  Investimos no crescimento profissional da equipe
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="py-16">
        <div className="container max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Formulário de Candidatura</CardTitle>
              <CardDescription>
                Preencha todos os campos abaixo para enviar sua candidatura. Campos marcados com * são obrigatórios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Nome Completo *</Label>
                      <Input
                        id="fullName"
                        required
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        placeholder="João da Silva"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="joao@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        required
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', maskPhone(e.target.value))}
                        placeholder="(61) 99999-9999"
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        required
                        value={formData.cpf}
                        onChange={(e) => handleInputChange('cpf', maskCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <Label htmlFor="birthDate">Data de Nascimento *</Label>
                      <Input
                        id="birthDate"
                        required
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange('birthDate', maskDate(e.target.value))}
                        placeholder="DD/MM/AAAA"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Endereço</h3>
                  
                  <div>
                    <Label htmlFor="address">Endereço Completo *</Label>
                    <Input
                      id="address"
                      required
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Rua, número, complemento"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        required
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Brasília"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        required
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                        placeholder="DF"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">CEP *</Label>
                      <Input
                        id="zipCode"
                        required
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', maskCEP(e.target.value))}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                    </div>
                  </div>
                </div>

                {/* Informações Profissionais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Informações Profissionais</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="position">Cargo Desejado *</Label>
                      <Select
                        value={formData.position}
                        onValueChange={(value) => handleInputChange('position', value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Professor(a) de Educação Infantil">Professor(a) de Educação Infantil</SelectItem>
                          <SelectItem value="Auxiliar de Educação Infantil">Auxiliar de Educação Infantil</SelectItem>
                          <SelectItem value="Coordenador(a) Pedagógico(a)">Coordenador(a) Pedagógico(a)</SelectItem>
                          <SelectItem value="Cuidador(a)">Cuidador(a)</SelectItem>
                          <SelectItem value="Nutricionista">Nutricionista</SelectItem>
                          <SelectItem value="Cozinheiro(a)">Cozinheiro(a)</SelectItem>
                          <SelectItem value="Auxiliar de Serviços Gerais">Auxiliar de Serviços Gerais</SelectItem>
                          <SelectItem value="Porteiro(a)">Porteiro(a)</SelectItem>
                          <SelectItem value="Administrativo">Administrativo</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="unitId">Unidade de Interesse (Opcional)</Label>
                      <Select
                        value={formData.unitId?.toString() || 'all'}
                        onValueChange={(value) => handleInputChange('unitId', value && value !== 'all' ? parseInt(value) : undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Qualquer unidade</SelectItem>
                          {units?.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id.toString()}>
                              {unit.unitName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="education">Escolaridade *</Label>
                    <Select
                      value={formData.education}
                      onValueChange={(value) => handleInputChange('education', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione sua escolaridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ensino Fundamental Completo">Ensino Fundamental Completo</SelectItem>
                        <SelectItem value="Ensino Médio Completo">Ensino Médio Completo</SelectItem>
                        <SelectItem value="Ensino Superior Cursando">Ensino Superior Cursando</SelectItem>
                        <SelectItem value="Ensino Superior Completo">Ensino Superior Completo</SelectItem>
                        <SelectItem value="Pós-Graduação">Pós-Graduação</SelectItem>
                        <SelectItem value="Mestrado">Mestrado</SelectItem>
                        <SelectItem value="Doutorado">Doutorado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="experience">Experiência Profissional</Label>
                    <Textarea
                      id="experience"
                      value={formData.experience}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      placeholder="Descreva suas experiências profissionais anteriores, especialmente na área de educação infantil..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="skills">Habilidades e Competências</Label>
                    <Textarea
                      id="skills"
                      value={formData.skills}
                      onChange={(e) => handleInputChange('skills', e.target.value)}
                      placeholder="Liste suas principais habilidades e competências..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="availability">Disponibilidade de Horário</Label>
                    <Input
                      id="availability"
                      value={formData.availability}
                      onChange={(e) => handleInputChange('availability', e.target.value)}
                      placeholder="Ex: Manhã e tarde, período integral, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="coverLetter">Carta de Apresentação</Label>
                    <Textarea
                      id="coverLetter"
                      value={formData.coverLetter}
                      onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                      placeholder="Conte-nos por que você deseja fazer parte da equipe COCRIS..."
                      rows={5}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando Candidatura...
                      </>
                    ) : (
                      'Enviar Candidatura'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
