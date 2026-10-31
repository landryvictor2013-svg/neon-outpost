NEON OUTPOST V11 — COOP EN LIGNE OPTIMISÉ

MISE EN LIGNE
1. Décompresse le ZIP.
2. Glisse le dossier neon_v11_p2p (celui qui contient index.html, game.js et style.css) dans Netlify Drop.
3. Ouvre la même adresse Netlify sur les deux appareils.

JOUER EN COOP
1. Le premier joueur clique sur COOP, puis CRÉER UN SALON.
2. Il copie le lien d’invitation ou partage le code à 6 caractères.
3. Le deuxième joueur ouvre le lien ou saisit le code dans REJOINDRE.
4. Lorsque le deuxième joueur est connecté, l’hôte clique sur LANCER LA PARTIE.

VIES ET NUKES EN COOP
Chaque joueur possède sa propre barre de vie et ses propres points de vie maximum (selon ses améliorations d’armure). Les dégâts subis par un joueur ne retirent pas de vie à l’autre.
Chaque joueur possède aussi son propre stock de nukes. Utiliser une nuke retire une nuke uniquement au joueur qui l’a déclenchée; l’explosion et les dégâts aux ennemis sont appliqués au monde commun.

VAISSEAUX ORANGE
La vitesse de déplacement des chasseurs orange a été réduite d’un facteur 1,5 par rapport à la version précédente.

SKINS DE VAISSEAUX 2D
Les 20 modèles ont maintenant des silhouettes de chasseurs sci-fi plus travaillées, avec coques intégrées, panneaux de blindage, verrières, canons, détails de structure et réacteurs lumineux néon. Les vaisseaux restent dessinés en 2D vus du dessus; aucun modèle 3D n’a été ajouté. Les aperçus du marché utilisent le même nouveau style.

PERFORMANCES RÉSEAU
L’ancienne version envoyait une copie complète de l’état du jeu (dont les particules et les effets) environ 11 fois par seconde. Cette version envoie un état réseau réduit, limite les objets purement visuels, évite d’empiler les paquets quand la connexion ralentit et interpole les positions entre les mises à jour.

Le jeu utilise PeerJS + WebRTC. La connexion directe est privilégiée. Pour certains routeurs stricts ou réseaux mobiles/scolaires, un relais TURN peut être nécessaire. Une intégration Metered TURN est prête dans game.js :
- crée un compte Metered : https://www.metered.ca/ ;
- crée des identifiants TURN et récupère le domaine Metered ainsi que la clé API TURN ;
- dans game.js, renseigne METERED_TURN_DOMAIN et METERED_TURN_API_KEY au début du fichier ;
- republie le dossier sur Netlify.

Sans clé TURN, le jeu essaie la connexion directe avec STUN, mais certains routeurs/pare-feu peuvent la bloquer. Avec TURN activé, le trafic peut passer par un relais; la latence dépend alors de la distance et de la qualité Internet. Le relais réduit les échecs de connexion liés aux routeurs, mais il n’annule pas la latence physique entre deux régions et ne garantit pas 60 FPS si un appareil ou sa connexion est trop lent. Le niveau gratuit Metered inclut actuellement 500 MB de trafic TURN par mois; les volumes supérieurs sont payants. Vérifie le tarif actuel avant de passer à une offre payante.

SAUVEGARDES
La progression (scores, gemmes, skins et améliorations) reste sauvegardée localement sur chaque appareil.

PC / MOBILE
Le coop fonctionne entre PC et mobile. Chaque joueur choisit son type de commandes dans Paramètres.


COOP - CORRECTIF DE CONNEXION
- Le joueur invité attend maintenant la confirmation de l’hôte avant d’afficher qu’il a rejoint le salon.
- Le jeu affiche une erreur explicite si le signal PeerJS, le canal WebRTC ou la confirmation échoue.
- Les deux joueurs doivent charger la même version publiée.
- Pour certains réseaux, configure le relais TURN selon TURN_SETUP.txt; STUN seul ne peut pas traverser tous les types de NAT.
