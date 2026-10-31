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
Le jeu utilise PeerJS + WebRTC avec sa configuration ICE par défaut. Celle-ci comprend STUN et les relais TURN fournis par PeerJS. Important : ne pas remplacer cette configuration par un objet ICE STUN-only, car cela désactive les relais TURN intégrés et peut bloquer les joueurs sur des réseaux différents. Aucun compte Metered ni clé personnelle n’est nécessaire pour utiliser les relais PeerJS. Comme tout relais public, la disponibilité et les règles d’utilisation dépendent du service PeerJS.


SAUVEGARDES
La progression (scores, gemmes, skins et améliorations) reste sauvegardée localement sur chaque appareil.

PC / MOBILE
Le coop fonctionne entre PC et mobile. Chaque joueur choisit son type de commandes dans Paramètres.


CORRECTIF RÉSEAU — CONFIGURATION PEERJS RESTAURÉE
La version précédente fournissait explicitement une liste ICE contenant seulement STUN; cela remplaçait les valeurs par défaut de PeerJS et retirait ses relais TURN. Cette version n’envoie plus d’option `config` au constructeur PeerJS : elle réutilise les serveurs STUN/TURN intégrés. Si une connexion ne s’ouvre toujours pas après 20 secondes, le salon affiche maintenant un diagnostic au lieu de rester indéfiniment sur « Ouverture de la connexion ».


CONFIGURATION RÉSEAU RENFORCÉE
Les deux clients (hôte et invité) reçoivent une configuration ICE explicite : STUN + relais TURN Open Relay sur les ports 80 et 443, avec TCP sur 443. Cela permet de tenter un relais quand une connexion directe est bloquée par le NAT ou le pare-feu. Open Relay est un service public tiers : sa disponibilité, ses limites et ses conditions peuvent changer; aucun service public ne garantit 100 % des réseaux.
