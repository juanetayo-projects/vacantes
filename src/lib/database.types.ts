export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      aprobaciones: {
        Row: {
          aprobador_id: string | null
          comentarios: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_aprobacion_enum"]
          fecha_decision: string | null
          id: number
          nivel: number
          nombre_nivel: string
          orden: number
          vacante_id: number
        }
        Insert: {
          aprobador_id?: string | null
          comentarios?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_aprobacion_enum"]
          fecha_decision?: string | null
          id?: never
          nivel: number
          nombre_nivel: string
          orden: number
          vacante_id: number
        }
        Update: {
          aprobador_id?: string | null
          comentarios?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_aprobacion_enum"]
          fecha_decision?: string | null
          id?: never
          nivel?: number
          nombre_nivel?: string
          orden?: number
          vacante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "aprobaciones_aprobador_id_fkey"
            columns: ["aprobador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprobaciones_vacante_id_fkey"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          id: number
          nombre: string
          responsable_id: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          id?: never
          nombre: string
          responsable_id?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          id?: never
          nombre?: string
          responsable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_responsable_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          created_at: string
          email: string | null
          experiencia_anios: number | null
          formacion: string | null
          fuente: Database["public"]["Enums"]["fuente_candidato_enum"] | null
          hoja_vida_url: string | null
          id: number
          nombre: string
          telefono: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          experiencia_anios?: number | null
          formacion?: string | null
          fuente?: Database["public"]["Enums"]["fuente_candidato_enum"] | null
          hoja_vida_url?: string | null
          id?: never
          nombre: string
          telefono?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          experiencia_anios?: number | null
          formacion?: string | null
          fuente?: Database["public"]["Enums"]["fuente_candidato_enum"] | null
          hoja_vida_url?: string | null
          id?: never
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      competencias: {
        Row: {
          id: number
          nombre: string
          peso_defecto: number | null
          tipo: string
        }
        Insert: {
          id?: never
          nombre: string
          peso_defecto?: number | null
          tipo?: string
        }
        Update: {
          id?: never
          nombre?: string
          peso_defecto?: number | null
          tipo?: string
        }
        Relationships: []
      }
      documentos_contratacion: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_documento_enum"]
          id: number
          postulacion_id: number
          tipo: string
          url: string | null
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_documento_enum"]
          id?: never
          postulacion_id: number
          tipo: string
          url?: string | null
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_documento_enum"]
          id?: never
          postulacion_id?: number
          tipo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_contratacion_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: false
            referencedRelation: "postulaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      entrevistas: {
        Row: {
          checklist: Json | null
          comentarios: string | null
          created_at: string
          entrevistador_id: string | null
          fecha: string | null
          id: number
          postulacion_id: number
          puntaje: number | null
          resultado: string | null
          tipo: Database["public"]["Enums"]["tipo_entrevista_enum"]
        }
        Insert: {
          checklist?: Json | null
          comentarios?: string | null
          created_at?: string
          entrevistador_id?: string | null
          fecha?: string | null
          id?: never
          postulacion_id: number
          puntaje?: number | null
          resultado?: string | null
          tipo: Database["public"]["Enums"]["tipo_entrevista_enum"]
        }
        Update: {
          checklist?: Json | null
          comentarios?: string | null
          created_at?: string
          entrevistador_id?: string | null
          fecha?: string | null
          id?: never
          postulacion_id?: number
          puntaje?: number | null
          resultado?: string | null
          tipo?: Database["public"]["Enums"]["tipo_entrevista_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "entrevistas_entrevistador_id_fkey"
            columns: ["entrevistador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: false
            referencedRelation: "postulaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluacion_competencias: {
        Row: {
          autoevaluacion: number | null
          competencia_id: number
          evaluador1: number | null
          evaluador2: number | null
          id: number
          peso: number
          postulacion_id: number
          promedio: number | null
        }
        Insert: {
          autoevaluacion?: number | null
          competencia_id: number
          evaluador1?: number | null
          evaluador2?: number | null
          id?: never
          peso?: number
          postulacion_id: number
          promedio?: number | null
        }
        Update: {
          autoevaluacion?: number | null
          competencia_id?: number
          evaluador1?: number | null
          evaluador2?: number | null
          id?: never
          peso?: number
          postulacion_id?: number
          promedio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_competencias_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluacion_competencias_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: false
            referencedRelation: "postulaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_estados: {
        Row: {
          comentario: string | null
          created_at: string
          entidad_id: number
          entidad_tipo: string
          estado_anterior: string | null
          estado_nuevo: string | null
          id: number
          usuario_id: string | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          entidad_id: number
          entidad_tipo: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: never
          usuario_id?: string | null
        }
        Update: {
          comentario?: string | null
          created_at?: string
          entidad_id?: number
          entidad_tipo?: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: never
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_estados_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inducciones: {
        Row: {
          checklist: Json | null
          created_at: string
          estado: string | null
          etapa: Database["public"]["Enums"]["etapa_induccion_enum"]
          fecha_ingreso: string | null
          id: number
          mentor_id: string | null
          postulacion_id: number
          updated_at: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          estado?: string | null
          etapa?: Database["public"]["Enums"]["etapa_induccion_enum"]
          fecha_ingreso?: string | null
          id?: never
          mentor_id?: string | null
          postulacion_id: number
          updated_at?: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          estado?: string | null
          etapa?: Database["public"]["Enums"]["etapa_induccion_enum"]
          fecha_ingreso?: string | null
          id?: never
          mentor_id?: string | null
          postulacion_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inducciones_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inducciones_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: false
            referencedRelation: "postulaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          created_at: string
          id: number
          leida: boolean
          mensaje: string | null
          referencia_id: number | null
          referencia_tabla: string | null
          tipo: string | null
          titulo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          leida?: boolean
          mensaje?: string | null
          referencia_id?: number | null
          referencia_tabla?: string | null
          tipo?: string | null
          titulo: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: never
          leida?: boolean
          mensaje?: string | null
          referencia_id?: number | null
          referencia_tabla?: string | null
          tipo?: string | null
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas: {
        Row: {
          aprobado_por: string | null
          beneficios: Json | null
          created_at: string
          estado: string
          fecha_aprobacion: string | null
          fecha_inicio: string | null
          id: number
          jornada: string | null
          observaciones: string | null
          postulacion_id: number
          salario_ofrecido: number | null
          tipo_contrato: string | null
        }
        Insert: {
          aprobado_por?: string | null
          beneficios?: Json | null
          created_at?: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_inicio?: string | null
          id?: never
          jornada?: string | null
          observaciones?: string | null
          postulacion_id: number
          salario_ofrecido?: number | null
          tipo_contrato?: string | null
        }
        Update: {
          aprobado_por?: string | null
          beneficios?: Json | null
          created_at?: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_inicio?: string | null
          id?: never
          jornada?: string | null
          observaciones?: string | null
          postulacion_id?: number
          salario_ofrecido?: number | null
          tipo_contrato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: false
            referencedRelation: "postulaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      postulaciones: {
        Row: {
          candidato_id: number
          estado: Database["public"]["Enums"]["estado_postulacion_enum"]
          fecha_postulacion: string
          id: number
          notas: string | null
          puntaje_ajuste: number | null
          updated_at: string
          vacante_id: number
        }
        Insert: {
          candidato_id: number
          estado?: Database["public"]["Enums"]["estado_postulacion_enum"]
          fecha_postulacion?: string
          id?: never
          notas?: string | null
          puntaje_ajuste?: number | null
          updated_at?: string
          vacante_id: number
        }
        Update: {
          candidato_id?: number
          estado?: Database["public"]["Enums"]["estado_postulacion_enum"]
          fecha_postulacion?: string
          id?: never
          notas?: string | null
          puntaje_ajuste?: number | null
          updated_at?: string
          vacante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "postulaciones_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_vacante_id_fkey"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          area_id: number | null
          avatar_url: string | null
          cargo: string | null
          ciudad: string | null
          created_at: string
          direccion: string | null
          email: string
          fecha_nacimiento: string | null
          id: string
          nombre: string
          numero_documento: string | null
          perm_administracion: boolean
          perm_aprobaciones: boolean
          perm_configuracion: boolean
          perm_gestion_vacantes: boolean
          perm_reportes: boolean
          role: Database["public"]["Enums"]["rol_usuario"]
          telefono: string | null
          tipo_documento: string | null
        }
        Insert: {
          activo?: boolean
          area_id?: number | null
          avatar_url?: string | null
          cargo?: string | null
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          email: string
          fecha_nacimiento?: string | null
          id: string
          nombre: string
          numero_documento?: string | null
          perm_administracion?: boolean
          perm_aprobaciones?: boolean
          perm_configuracion?: boolean
          perm_gestion_vacantes?: boolean
          perm_reportes?: boolean
          role?: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
          tipo_documento?: string | null
        }
        Update: {
          activo?: boolean
          area_id?: number | null
          avatar_url?: string | null
          cargo?: string | null
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          email?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          numero_documento?: string | null
          perm_administracion?: boolean
          perm_aprobaciones?: boolean
          perm_configuracion?: boolean
          perm_gestion_vacantes?: boolean
          perm_reportes?: boolean
          role?: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      requisiciones: {
        Row: {
          analisis_puesto: string | null
          canales_busqueda: string[] | null
          created_at: string
          cronograma_fin: string | null
          cronograma_inicio: string | null
          descripcion_cargo_estandarizada: string | null
          estrategia_comunicacion: string | null
          id: number
          presupuesto_reclutamiento: number | null
          reclutador_id: string | null
          vacante_id: number
        }
        Insert: {
          analisis_puesto?: string | null
          canales_busqueda?: string[] | null
          created_at?: string
          cronograma_fin?: string | null
          cronograma_inicio?: string | null
          descripcion_cargo_estandarizada?: string | null
          estrategia_comunicacion?: string | null
          id?: never
          presupuesto_reclutamiento?: number | null
          reclutador_id?: string | null
          vacante_id: number
        }
        Update: {
          analisis_puesto?: string | null
          canales_busqueda?: string[] | null
          created_at?: string
          cronograma_fin?: string | null
          cronograma_inicio?: string | null
          descripcion_cargo_estandarizada?: string | null
          estrategia_comunicacion?: string | null
          id?: never
          presupuesto_reclutamiento?: number | null
          reclutador_id?: string | null
          vacante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "requisiciones_reclutador_id_fkey"
            columns: ["reclutador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisiciones_vacante_id_fkey"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      seguimientos: {
        Row: {
          created_at: string
          dias: number
          encuesta_satisfaccion: Json | null
          evaluador_id: string | null
          fecha_evaluacion: string | null
          id: number
          induccion_id: number
          necesidades_desarrollo: string | null
          puntaje_desempeno: number | null
          resultado: string | null
        }
        Insert: {
          created_at?: string
          dias: number
          encuesta_satisfaccion?: Json | null
          evaluador_id?: string | null
          fecha_evaluacion?: string | null
          id?: never
          induccion_id: number
          necesidades_desarrollo?: string | null
          puntaje_desempeno?: number | null
          resultado?: string | null
        }
        Update: {
          created_at?: string
          dias?: number
          encuesta_satisfaccion?: Json | null
          evaluador_id?: string | null
          fecha_evaluacion?: string | null
          id?: never
          induccion_id?: number
          necesidades_desarrollo?: string | null
          puntaje_desempeno?: number | null
          resultado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seguimientos_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimientos_induccion_id_fkey"
            columns: ["induccion_id"]
            isOneToOne: false
            referencedRelation: "inducciones"
            referencedColumns: ["id"]
          },
        ]
      }
      vacante_competencias: {
        Row: {
          competencia_id: number
          id: number
          peso: number
          vacante_id: number
        }
        Insert: {
          competencia_id: number
          id?: never
          peso?: number
          vacante_id: number
        }
        Update: {
          competencia_id?: number
          id?: never
          peso?: number
          vacante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "vacante_competencias_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacante_competencias_vacante_id_fkey"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      vacante_documentos: {
        Row: {
          created_at: string
          id: number
          nombre_archivo: string
          subido_por: string | null
          url: string
          vacante_id: number
        }
        Insert: {
          created_at?: string
          id?: never
          nombre_archivo: string
          subido_por?: string | null
          url: string
          vacante_id: number
        }
        Update: {
          created_at?: string
          id?: never
          nombre_archivo?: string
          subido_por?: string | null
          url?: string
          vacante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "vacante_documentos_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacante_documentos_vacante_id_fkey"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      vacante_requisitos: {
        Row: {
          descripcion: string
          id: number
          tipo: string
          vacante_id: number
        }
        Insert: {
          descripcion: string
          id?: never
          tipo: string
          vacante_id: number
        }
        Update: {
          descripcion?: string
          id?: never
          tipo?: string
          vacante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "vacante_requisitos_vacante_id_fkey"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      vacantes: {
        Row: {
          area_id: number
          cargo: string
          codigo: string
          created_at: string
          descripcion_cargo: string | null
          estado: Database["public"]["Enums"]["estado_vacante_enum"]
          fecha_cierre: string | null
          fecha_estimada_cobertura: string | null
          fecha_publicacion: string | null
          id: number
          justificacion: string | null
          nivel_urgencia: Database["public"]["Enums"]["nivel_urgencia_enum"]
          numero_vacantes: number
          presupuesto: number | null
          rango_salarial_max: number | null
          rango_salarial_min: number | null
          reclutador_id: string | null
          solicitante_id: string
          tipo_vacante: Database["public"]["Enums"]["tipo_vacante_enum"]
          updated_at: string
        }
        Insert: {
          area_id: number
          cargo: string
          codigo?: string
          created_at?: string
          descripcion_cargo?: string | null
          estado?: Database["public"]["Enums"]["estado_vacante_enum"]
          fecha_cierre?: string | null
          fecha_estimada_cobertura?: string | null
          fecha_publicacion?: string | null
          id?: never
          justificacion?: string | null
          nivel_urgencia?: Database["public"]["Enums"]["nivel_urgencia_enum"]
          numero_vacantes?: number
          presupuesto?: number | null
          rango_salarial_max?: number | null
          rango_salarial_min?: number | null
          reclutador_id?: string | null
          solicitante_id: string
          tipo_vacante?: Database["public"]["Enums"]["tipo_vacante_enum"]
          updated_at?: string
        }
        Update: {
          area_id?: number
          cargo?: string
          codigo?: string
          created_at?: string
          descripcion_cargo?: string | null
          estado?: Database["public"]["Enums"]["estado_vacante_enum"]
          fecha_cierre?: string | null
          fecha_estimada_cobertura?: string | null
          fecha_publicacion?: string | null
          id?: never
          justificacion?: string | null
          nivel_urgencia?: Database["public"]["Enums"]["nivel_urgencia_enum"]
          numero_vacantes?: number
          presupuesto?: number | null
          rango_salarial_max?: number | null
          rango_salarial_min?: number | null
          reclutador_id?: string | null
          solicitante_id?: string
          tipo_vacante?: Database["public"]["Enums"]["tipo_vacante_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacantes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacantes_reclutador_id_fkey"
            columns: ["reclutador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacantes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      estado_aprobacion_enum:
        | "pendiente"
        | "aprobado"
        | "rechazado"
        | "modificacion_solicitada"
      estado_documento_enum: "pendiente" | "recibido" | "completado"
      estado_postulacion_enum:
        | "postulado"
        | "preseleccionado"
        | "entrevista"
        | "finalista"
        | "seleccionado"
        | "no_seleccionado"
        | "descartado"
      estado_vacante_enum:
        | "borrador"
        | "pendiente_aprobacion"
        | "aprobada"
        | "rechazada"
        | "en_requisicion"
        | "publicada"
        | "en_evaluacion"
        | "en_oferta"
        | "contratada"
        | "en_induccion"
        | "cerrada"
        | "cancelada"
      etapa_induccion_enum:
        | "pre_induccion"
        | "induccion_general"
        | "induccion_especifica"
        | "evaluacion"
      fuente_candidato_enum:
        | "portal_empleo"
        | "referido"
        | "linkedin"
        | "pagina_web"
        | "otros"
      nivel_urgencia_enum: "bajo" | "medio" | "alto" | "critico"
      rol_usuario:
        | "admin"
        | "solicitante"
        | "aprobador"
        | "reclutador"
        | "direccion"
      tipo_entrevista_enum:
        | "inicial"
        | "tecnica"
        | "area_solicitante"
        | "final_gerencia"
      tipo_vacante_enum: "creacion" | "reemplazo" | "expansion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_aprobacion_enum: [
        "pendiente",
        "aprobado",
        "rechazado",
        "modificacion_solicitada",
      ],
      estado_documento_enum: ["pendiente", "recibido", "completado"],
      estado_postulacion_enum: [
        "postulado",
        "preseleccionado",
        "entrevista",
        "finalista",
        "seleccionado",
        "no_seleccionado",
        "descartado",
      ],
      estado_vacante_enum: [
        "borrador",
        "pendiente_aprobacion",
        "aprobada",
        "rechazada",
        "en_requisicion",
        "publicada",
        "en_evaluacion",
        "en_oferta",
        "contratada",
        "en_induccion",
        "cerrada",
        "cancelada",
      ],
      etapa_induccion_enum: [
        "pre_induccion",
        "induccion_general",
        "induccion_especifica",
        "evaluacion",
      ],
      fuente_candidato_enum: [
        "portal_empleo",
        "referido",
        "linkedin",
        "pagina_web",
        "otros",
      ],
      nivel_urgencia_enum: ["bajo", "medio", "alto", "critico"],
      rol_usuario: [
        "admin",
        "solicitante",
        "aprobador",
        "reclutador",
        "direccion",
      ],
      tipo_entrevista_enum: [
        "inicial",
        "tecnica",
        "area_solicitante",
        "final_gerencia",
      ],
      tipo_vacante_enum: ["creacion", "reemplazo", "expansion"],
    },
  },
} as const
