"""
Script pour lancer les tests avec des options utiles.
"""

import os
import sys
import django
from django.core.management import call_command

# Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eds_backend.settings')
django.setup()


def run_tests(verbose=False, coverage=False):
    """
    Lancer les tests avec des options.
    
    Args:
        verbose: Afficher plus de détails
        coverage: Générer un rapport de couverture
    """
    print('\n' + '='*70)
    print('🧪 Lancement des tests pour EDS Backend')
    print('='*70 + '\n')
    
    if coverage:
        try:
            import coverage as cov
            
            # Démarrer la couverture
            cov_instance = cov.Coverage()
            cov_instance.start()
            
            # Lancer les tests
            verbosity = 2 if verbose else 1
            call_command('test', 'authentication', verbosity=verbosity)
            
            # Arrêter la couverture et générer le rapport
            cov_instance.stop()
            cov_instance.save()
            
            print('\n' + '='*70)
            print('📊 Rapport de couverture')
            print('='*70 + '\n')
            
            cov_instance.report()
            
            # Générer le rapport HTML
            cov_instance.html_report(directory='htmlcov')
            print('\n✅ Rapport HTML généré dans le dossier "htmlcov/"')
            
        except ImportError:
            print('❌ Le package "coverage" n\'est pas installé.')
            print('   Installez-le avec: pip install coverage')
            sys.exit(1)
    else:
        # Lancer les tests sans couverture
        verbosity = 2 if verbose else 1
        call_command('test', 'authentication', verbosity=verbosity)
    
    print('\n' + '='*70)
    print('✅ Tests terminés!')
    print('='*70 + '\n')


if __name__ == '__main__':
    # Parser les arguments
    verbose = '--verbose' in sys.argv or '-v' in sys.argv
    coverage = '--coverage' in sys.argv or '-c' in sys.argv
    
    run_tests(verbose=verbose, coverage=coverage)




