import React from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { PolicyCitation } from '../../types/knowledge'
import {
  CheckCircle2,
  ShieldCheck,
  X,
  Scale,
  Calendar
} from 'lucide-react'

interface PolicyCitationModalProps {
  isOpen: boolean
  onClose: () => void
  citation: PolicyCitation | null
}

export const PolicyCitationModal: React.FC<PolicyCitationModalProps> = ({
  isOpen,
  onClose,
  citation,
}) => {
  if (!isOpen || !citation) return null

  const doc = citation.document

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/60 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div
        className="bg-canvas-pure border border-border-subtle rounded-[6px] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col font-sans overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-border-subtle bg-canvas-subtle/50 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-accent-subtle border border-accent-border flex items-center justify-center text-accent">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink-primary">
                  {citation.policyId}
                </span>
                <Badge variant="mono" size="xs" className="font-mono font-bold">
                  {citation.version}
                </Badge>
                <Badge variant="live" size="xs" className="font-mono">
                  AUDITED RULE
                </Badge>
              </div>
              <h2 className="text-sm font-bold text-ink-primary leading-tight mt-0.5">
                {citation.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-canvas-muted transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Section & Citation Provenance Banner */}
          <div className="bg-canvas-subtle border border-border-subtle rounded-[4px] p-3 space-y-1 font-mono">
            <div className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
              CITING CLAUSE SPECIFICATION
            </div>
            <div className="text-xs font-bold text-accent">
              {citation.section}
            </div>
            <p className="text-[11px] font-sans text-ink-secondary leading-relaxed pt-1">
              "{citation.clauseText}"
            </p>
          </div>

          {/* Full Policy Clauses */}
          {doc && doc.clauses && doc.clauses.length > 0 && (
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                ACTIVE POLICY CLAUSES
              </div>
              <div className="space-y-2">
                {doc.clauses.map((clause, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-[4px] border border-border-subtle bg-canvas-pure space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-ink-primary">
                        Clause {clause.clauseId}: {clause.title}
                      </span>
                      {clause.clauseId === citation.clauseId && (
                        <span className="text-[9px] font-bold text-ops-live bg-ops-liveBg px-1.5 py-0.2 rounded border border-ops-liveBorder uppercase">
                          MATCHED EVIDENCE
                        </span>
                      )}
                    </div>
                    <p className="text-ink-secondary text-[11px] leading-relaxed">
                      {clause.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mandatory Policy Validation Gates */}
          {doc && doc.mandatoryChecks && (
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                MANDATORY ENFORCEMENT CHECKS (5-POINT EVALUATION)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
                {doc.mandatoryChecks.map((check, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 p-1.5 rounded-[3px] bg-canvas-subtle border border-border-subtle text-ink-secondary"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-ops-live shrink-0" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy Metadata & Last Updated */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle/80 font-mono text-[10px] text-ink-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              <span>Last Audited: {doc?.lastUpdated || '2026-06-15'}</span>
            </div>
            <div className="flex items-center gap-1 text-ops-live font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CRYPTOGRAPHICALLY AUDITABLE</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border-subtle bg-canvas-subtle/50 flex items-center justify-end gap-2 shrink-0">
          <Button variant="secondary" size="xs" onClick={onClose} className="font-mono text-[11px]">
            DISMISS
          </Button>
        </div>
      </div>
    </div>
  )
}
